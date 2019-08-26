import pandas as pd
from operator import itemgetter
import networkx as nx
from networkx.algorithms.bipartite import biadjacency_matrix
from sklearn.cluster.bicluster import SpectralCoclustering, SpectralBiclustering
from matplotlib import pyplot as plt
import numpy as np
import numpy.ma as ma

from coclust.coclustering import CoclustMod, CoclustSpecMod
from coclust.visualization import (plot_reorganized_matrix,
                                  plot_cluster_top_terms,
                                  plot_max_modularities,
                                  get_term_graph)
from coclust.evaluation.internal import best_modularity_partition

class BiCluster(object):
    def __init__(self):
        pass

    def subcluster3(self, clusterID, tempMem, num_clusters):
        clusterID_array = [int(x) for x in clusterID.split('.')]
        # print(clusterID_array)
        # print("tempMem["subModels"]",tempMem["subModels"])
        subMatrix = tempMem["model"].get_submatrix(tempMem["matrix"],clusterID_array[0])
        sub_row_order = tempMem["row_order"][tempMem["model"].get_indices(clusterID_array[0])[0]]
        sub_column_order = tempMem["column_order"][tempMem["model"].get_indices(clusterID_array[0])[1]]

        for i, cID in enumerate(clusterID_array[1:]):
            smID = '.'.join(str(x) for x in clusterID_array[:(i+1)])
            sm = tempMem["subModels"][smID]
            subMatrix = sm.get_submatrix(subMatrix,cID)
            sub_row_order = sub_row_order[sm.get_indices(cID)[0]]
            sub_column_order = sub_column_order[sm.get_indices(cID)[1]]

        zeros_cols = np.where(~subMatrix.any(axis=0))[0]
        zeros_rows = np.where(~subMatrix.any(axis=1))[0]
        subMatrix = np.delete(subMatrix, zeros_cols, 1)
        subMatrix = np.delete(subMatrix, zeros_rows, 0)
        sub_row_order = np.delete(sub_row_order, zeros_rows)
        sub_column_order = np.delete(sub_column_order, zeros_cols)

        num_clusters2 = min(min(subMatrix.shape), num_clusters)

        subModel = CoclustMod(num_clusters2,random_state=0)

        tempMem["subModels"][clusterID] = subModel
        # print("tempMem["subModels"]",tempMem["subModels"])
        subModel.fit(subMatrix)

        for i, label in enumerate(subModel.row_labels_):
            tempMem["rowMap"][sub_row_order[i]] = str(clusterID)+"."+str(label)

        for i, label in enumerate(subModel.column_labels_):
            tempMem["colMap"][sub_column_order[i]] = str(clusterID)+"."+str(label)

        # ret = []
        # wel = tempMem["weighted_edge_list"].copy()
        # wel[tempMem["firstGroupIndex"]].update(wel[tempMem["firstGroupIndex"]].map(tempMem["rowMap"]))
        # wel[tempMem["secondGroupIndex"]].update(wel[tempMem["secondGroupIndex"]].map(tempMem["colMap"]))

        rowLabelSet = set([str(clusterID)+"."+str(x) for x in subModel.row_labels_])
        colLabelSet = set([str(clusterID)+"."+str(x) for x in subModel.column_labels_])
        #---

        rowMap2 = {k:(v if v in rowLabelSet else "Sonstige") for k,v in tempMem["rowMap"].items()}
        colMap2 = {k:(v if v in colLabelSet else "Sonstige") for k,v in tempMem["colMap"].items()}

        wel = tempMem["weighted_edge_list"].copy()
        # print(rowLabelSet)

        wel[tempMem["firstGroupIndex"]].update(wel[tempMem["firstGroupIndex"]].map(rowMap2))
        wel[tempMem["secondGroupIndex"]].update(wel[tempMem["secondGroupIndex"]].map(colMap2))

        idc = wel[(wel[tempMem["firstGroupIndex"]].astype(str).str[:len(clusterID)] != clusterID) & (wel[tempMem["secondGroupIndex"]].astype(str).str[:len(clusterID)] != clusterID)].index
        wel = wel.drop(idc)

        wel2 = tempMem["weighted_edge_list"].copy()
        wel2 = wel2.drop(idc)
        row_sums_map2 = wel2.groupby(by = [tempMem["firstGroupIndex"]]).sum().to_dict()[tempMem["valueIndex"]]
        row_sums_map2 = {k:float(v) for k,v in row_sums_map2.items()}
        column_sums_map2 = wel2.groupby(by = [tempMem["secondGroupIndex"]]).sum().to_dict()[tempMem["valueIndex"]]
        column_sums_map2 = {k:float(v) for k,v in column_sums_map2.items()}

        ret = []
        ret = wel.as_matrix().tolist()

        # clusters = self.getElementsbyCluster()
        inv_rowMap2 = {}
        for k, v in rowMap2.items():
            inv_rowMap2.setdefault(v, []).append(k)

        inv_colMap2 = {}
        for k, v in colMap2.items():
            inv_colMap2.setdefault(v, []).append(k)

        clusters = {}
        for label in inv_rowMap2:
            clusters[label] = {
                "rows": {k: row_sums_map2[k] for k in inv_rowMap2[label] if k in row_sums_map2},
                "columns": {k: column_sums_map2[k] for k in inv_colMap2[label] if k in column_sums_map2}
            }

        return {"data": ret, "clusters": clusters}
        # return {"data": ret, "clusters": clusters, "rows": [[k,v] for k,v in tempMem["row_sums_map"].items()], "columns": [[k,v] for k,v in column_sums_map.items()]}

    def removeSubClusters3(self, clusterID, tempMem):
        smID = clusterID[:clusterID.rfind(".")]

        for key, value in tempMem["rowMap"].items():
            if(tempMem["rowMap"][key].startswith(clusterID)):
                tempMem["rowMap"][key] = clusterID

        for key, value in tempMem["colMap"].items():
            if(tempMem["colMap"][key].startswith(clusterID)):
                tempMem["colMap"][key] = clusterID

        rowMap2 = {k:(v if v.startswith(smID) else "Sonstige") for k,v in tempMem["rowMap"].items()}
        colMap2 = {k:(v if v.startswith(smID) else "Sonstige") for k,v in tempMem["colMap"].items()}


        wel = tempMem["weighted_edge_list"].copy()

        wel[tempMem["firstGroupIndex"]].update(wel[tempMem["firstGroupIndex"]].map(rowMap2))
        wel[tempMem["secondGroupIndex"]].update(wel[tempMem["secondGroupIndex"]].map(colMap2))

        idc = wel[(wel[tempMem["firstGroupIndex"]].astype(str).str[:len(smID)] != smID) & (wel[tempMem["secondGroupIndex"]].astype(str).str[:len(smID)] != smID)].index
        wel = wel.drop(idc)

        wel2 = tempMem["weighted_edge_list"].copy()
        wel2 = wel2.drop(idc)
        row_sums_map2 = wel2.groupby(by = [tempMem["firstGroupIndex"]]).sum().to_dict()[tempMem["valueIndex"]]
        row_sums_map2 = {k:float(v) for k,v in row_sums_map2.items()}
        column_sums_map2 = wel2.groupby(by = [tempMem["secondGroupIndex"]]).sum().to_dict()[tempMem["valueIndex"]]
        column_sums_map2 = {k:float(v) for k,v in column_sums_map2.items()}

        ret = []
        ret = wel.as_matrix().tolist()

        # clusters = self.getElementsbyCluster()
        inv_rowMap2 = {}
        for k, v in rowMap2.items():
            inv_rowMap2.setdefault(v, []).append(k)

        inv_colMap2 = {}
        for k, v in colMap2.items():
            inv_colMap2.setdefault(v, []).append(k)

        clusters = {}
        for label in inv_rowMap2:
            clusters[label] = {
                "rows": {k: row_sums_map2[k] for k in inv_rowMap2[label] if k in row_sums_map2},
                "columns": {k: column_sums_map2[k] for k in inv_colMap2[label] if k in column_sums_map2}
            }

        return {"data": ret, "clusters": clusters}
        # return {"data": ret, "clusters": clusters, "rows": [[k,v] for k,v in tempMem["subModels"].items()], "columns": [[k,v] for k,v in tempMem["column_sums_map"].items()]}

    def cluster(self, data, tempMem, num_clusters):
        #global weighted_edge_list, tempMem["firstGroupIndex"], tempMem["secondGroupIndex"], tempMem["valueIndex"], tempMem["matrix"], tempMem["model"], tempMem["row_order"], tempMem["column_order"], tempMem["rowMap"], tempMem["colMap"], tempMem["subModels"], tempMem["subModels"], tempMem["column_sums_map"]
        tempMem["subModels"] = {}

        dataKeys = data.keys();
        tempMem["firstGroupIndex"] = dataKeys[0]
        tempMem["secondGroupIndex"] = dataKeys[len(dataKeys) - 2]
        tempMem["valueIndex"] = dataKeys[len(dataKeys) - 1]

        # num_clusters = 9
        tempMem["weighted_edge_list"] = data[[tempMem["firstGroupIndex"],tempMem["secondGroupIndex"],tempMem["valueIndex"]]]
        tempMem["weighted_edge_list"] = tempMem["weighted_edge_list"].groupby(by = [tempMem["firstGroupIndex"], tempMem["secondGroupIndex"]]).sum().reset_index()

        G = nx.from_pandas_dataframe(tempMem["weighted_edge_list"],tempMem["firstGroupIndex"],tempMem["secondGroupIndex"],tempMem["valueIndex"], create_using=nx.DiGraph())
        tempMem["row_order"] = np.sort(np.unique(tempMem["weighted_edge_list"][tempMem["firstGroupIndex"]]))
        tempMem["column_order"] = np.sort(np.unique(tempMem["weighted_edge_list"][tempMem["secondGroupIndex"]]))
        matrix_real = biadjacency_matrix(G, tempMem["row_order"], column_order=tempMem["column_order"], weight=tempMem["valueIndex"])
        tempMem["matrix"] = matrix_real.toarray()
        row_sums = tempMem["matrix"].sum(axis=1).round(2)
        tempMem["row_sums_map"] = dict(zip(tempMem["row_order"], row_sums))
        tempMem["row_sums_map"] = {k:float(v) for k,v in tempMem["row_sums_map"].items()}
        column_sums = tempMem["matrix"].sum(axis=0).round(2)
        tempMem["column_sums_map"] = dict(zip(tempMem["column_order"], column_sums))
        tempMem["column_sums_map"] = {k:float(v) for k,v in tempMem["column_sums_map"].items()}

        tempMem["model"] = CoclustMod(min(min(tempMem["matrix"].shape), num_clusters),random_state=0) #n_init=500
        tempMem["model"].fit(tempMem["matrix"])

        #test andere liste senden
        tempMem["rowMap"] = dict(zip(tempMem["row_order"], list(map(str, tempMem["model"].row_labels_))))
        tempMem["colMap"] = dict(zip(tempMem["column_order"], list(map(str,tempMem["model"].column_labels_))))
        ret = []

        wel = tempMem["weighted_edge_list"].copy()
        wel[tempMem["firstGroupIndex"]].update(wel[tempMem["firstGroupIndex"]].map(tempMem["rowMap"]))
        wel[tempMem["secondGroupIndex"]].update(wel[tempMem["secondGroupIndex"]].map(tempMem["colMap"]))
        #ret = wel.as_matrix().tolist()
        ret = wel.values.tolist()

        clusters = self.getElementsbyCluster(tempMem)

        return {"data": ret, "clusters": clusters}
        # return {"data": ret, "clusters": clusters, "rows": [[k,v] for k,v in tempMem["row_sums_map"].items()], "columns": [[k,v] for k,v in tempMem["column_sums_map"].items()]}

    def getElementsbyCluster(self, tempMem):
        inv_rowMap = {}
        for k, v in tempMem["rowMap"] .items():
            inv_rowMap.setdefault(v, []).append(k)

        inv_colMap = {}
        for k, v in tempMem["colMap"].items():
            inv_colMap.setdefault(v, []).append(k)

        clusters = {}
        for label in inv_rowMap:
            clusters[label] = {
                "rows": {k: tempMem["row_sums_map"][k] for k in inv_rowMap[label] if k in tempMem["row_sums_map"]},
                "columns": {k: tempMem["column_sums_map"][k] for k in inv_colMap[label] if k in tempMem["column_sums_map"]}
            }
        return clusters

    #def setNumClusters(self, num):
    #    global num_clusters
    #    num_clusters = num
    #   return ""

    def filterData(self, data, filters):
        data_tmp = data.copy()
        for f in filters:
            data_tmp = data_tmp[data_tmp[f].isin(filters[f])]

        return data_tmp
