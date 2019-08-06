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

    def subcluster3(self, clusterID, cacheObject, num_clusters):
        clusterID_array = [int(x) for x in clusterID.split('.')]
        # print(clusterID_array)
        # print("cacheObject["subModels"]",cacheObject["subModels"])
        subMatrix = cacheObject["model"].get_submatrix(cacheObject["matrix"],clusterID_array[0])
        sub_row_order = cacheObject["row_order"][cacheObject["model"].get_indices(clusterID_array[0])[0]]
        sub_column_order = cacheObject["column_order"][cacheObject["model"].get_indices(clusterID_array[0])[1]]

        for i, cID in enumerate(clusterID_array[1:]):
            smID = '.'.join(str(x) for x in clusterID_array[:(i+1)])
            sm = cacheObject["subModels"][smID]
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

        cacheObject["subModels"][clusterID] = subModel
        # print("cacheObject["subModels"]",cacheObject["subModels"])
        subModel.fit(subMatrix)

        for i, label in enumerate(subModel.row_labels_):
            cacheObject["rowMap"][sub_row_order[i]] = str(clusterID)+"."+str(label)

        for i, label in enumerate(subModel.column_labels_):
            cacheObject["colMap"][sub_column_order[i]] = str(clusterID)+"."+str(label)

        # ret = []
        # wel = cacheObject["weighted_edge_list"].copy()
        # wel[cacheObject["firstGroupIndex"]].update(wel[cacheObject["firstGroupIndex"]].map(cacheObject["rowMap"]))
        # wel[cacheObject["secondGroupIndex"]].update(wel[cacheObject["secondGroupIndex"]].map(cacheObject["colMap"]))

        rowLabelSet = set([str(clusterID)+"."+str(x) for x in subModel.row_labels_])
        colLabelSet = set([str(clusterID)+"."+str(x) for x in subModel.column_labels_])
        #---

        rowMap2 = {k:(v if v in rowLabelSet else "Sonstige") for k,v in cacheObject["rowMap"].items()}
        colMap2 = {k:(v if v in colLabelSet else "Sonstige") for k,v in cacheObject["colMap"].items()}

        wel = cacheObject["weighted_edge_list"].copy()
        # print(rowLabelSet)

        wel[cacheObject["firstGroupIndex"]].update(wel[cacheObject["firstGroupIndex"]].map(rowMap2))
        wel[cacheObject["secondGroupIndex"]].update(wel[cacheObject["secondGroupIndex"]].map(colMap2))

        idc = wel[(wel[cacheObject["firstGroupIndex"]].astype(str).str[:len(clusterID)] != clusterID) & (wel[cacheObject["secondGroupIndex"]].astype(str).str[:len(clusterID)] != clusterID)].index
        wel = wel.drop(idc)

        wel2 = cacheObject["weighted_edge_list"].copy()
        wel2 = wel2.drop(idc)
        row_sums_map2 = wel2.groupby(by = [cacheObject["firstGroupIndex"]]).sum().to_dict()[cacheObject["valueIndex"]]
        row_sums_map2 = {k:float(v) for k,v in row_sums_map2.items()}
        column_sums_map2 = wel2.groupby(by = [cacheObject["secondGroupIndex"]]).sum().to_dict()[cacheObject["valueIndex"]]
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
        # return {"data": ret, "clusters": clusters, "rows": [[k,v] for k,v in cacheObject["row_sums_map"].items()], "columns": [[k,v] for k,v in column_sums_map.items()]}

    def removeSubClusters3(self, clusterID, cacheObject):
        smID = clusterID[:clusterID.rfind(".")]

        for key, value in cacheObject["rowMap"].items():
            if(cacheObject["rowMap"][key].startswith(clusterID)):
                cacheObject["rowMap"][key] = clusterID

        for key, value in cacheObject["colMap"].items():
            if(cacheObject["colMap"][key].startswith(clusterID)):
                cacheObject["colMap"][key] = clusterID

        rowMap2 = {k:(v if v.startswith(smID) else "Sonstige") for k,v in cacheObject["rowMap"].items()}
        colMap2 = {k:(v if v.startswith(smID) else "Sonstige") for k,v in cacheObject["colMap"].items()}


        wel = cacheObject["weighted_edge_list"].copy()

        wel[cacheObject["firstGroupIndex"]].update(wel[cacheObject["firstGroupIndex"]].map(rowMap2))
        wel[cacheObject["secondGroupIndex"]].update(wel[cacheObject["secondGroupIndex"]].map(colMap2))

        idc = wel[(wel[cacheObject["firstGroupIndex"]].astype(str).str[:len(smID)] != smID) & (wel[cacheObject["secondGroupIndex"]].astype(str).str[:len(smID)] != smID)].index
        wel = wel.drop(idc)

        wel2 = cacheObject["weighted_edge_list"].copy()
        wel2 = wel2.drop(idc)
        row_sums_map2 = wel2.groupby(by = [cacheObject["firstGroupIndex"]]).sum().to_dict()[cacheObject["valueIndex"]]
        row_sums_map2 = {k:float(v) for k,v in row_sums_map2.items()}
        column_sums_map2 = wel2.groupby(by = [cacheObject["secondGroupIndex"]]).sum().to_dict()[cacheObject["valueIndex"]]
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
        # return {"data": ret, "clusters": clusters, "rows": [[k,v] for k,v in cacheObject["subModels"].items()], "columns": [[k,v] for k,v in cacheObject["column_sums_map"].items()]}

    def cluster(self, data, cacheObject, num_clusters):
        #global weighted_edge_list, cacheObject["firstGroupIndex"], cacheObject["secondGroupIndex"], cacheObject["valueIndex"], cacheObject["matrix"], cacheObject["model"], cacheObject["row_order"], cacheObject["column_order"], cacheObject["rowMap"], cacheObject["colMap"], cacheObject["subModels"], cacheObject["subModels"], cacheObject["column_sums_map"]
        cacheObject["subModels"] = {}

        dataKeys = data.keys();
        cacheObject["firstGroupIndex"] = dataKeys[0]
        cacheObject["secondGroupIndex"] = dataKeys[len(dataKeys) - 2]
        cacheObject["valueIndex"] = dataKeys[len(dataKeys) - 1]

        print("the keys: ")
        print(cacheObject["firstGroupIndex"])
        print(cacheObject["secondGroupIndex"])
        print(cacheObject["valueIndex"])
        # num_clusters = 9
        cacheObject["weighted_edge_list"] = data[[cacheObject["firstGroupIndex"],cacheObject["secondGroupIndex"],cacheObject["valueIndex"]]]
        cacheObject["weighted_edge_list"] = cacheObject["weighted_edge_list"].groupby(by = [cacheObject["firstGroupIndex"], cacheObject["secondGroupIndex"]]).sum().reset_index()

        G = nx.from_pandas_dataframe(cacheObject["weighted_edge_list"],cacheObject["firstGroupIndex"],cacheObject["secondGroupIndex"],cacheObject["valueIndex"], create_using=nx.DiGraph())
        cacheObject["row_order"] = np.sort(np.unique(cacheObject["weighted_edge_list"][cacheObject["firstGroupIndex"]]))
        cacheObject["column_order"] = np.sort(np.unique(cacheObject["weighted_edge_list"][cacheObject["secondGroupIndex"]]))
        matrix_real = biadjacency_matrix(G, cacheObject["row_order"], column_order=cacheObject["column_order"], weight=cacheObject["valueIndex"])
        cacheObject["matrix"] = matrix_real.toarray()
        row_sums = cacheObject["matrix"].sum(axis=1).round(2)
        cacheObject["row_sums_map"] = dict(zip(cacheObject["row_order"], row_sums))
        cacheObject["row_sums_map"] = {k:float(v) for k,v in cacheObject["row_sums_map"].items()}
        column_sums = cacheObject["matrix"].sum(axis=0).round(2)
        cacheObject["column_sums_map"] = dict(zip(cacheObject["column_order"], column_sums))
        cacheObject["column_sums_map"] = {k:float(v) for k,v in cacheObject["column_sums_map"].items()}

        cacheObject["model"] = CoclustMod(min(min(cacheObject["matrix"].shape), num_clusters),random_state=0) #n_init=500
        cacheObject["model"].fit(cacheObject["matrix"])

        #test andere liste senden
        cacheObject["rowMap"] = dict(zip(cacheObject["row_order"], list(map(str, cacheObject["model"].row_labels_))))
        cacheObject["colMap"] = dict(zip(cacheObject["column_order"], list(map(str,cacheObject["model"].column_labels_))))
        ret = []

        wel = cacheObject["weighted_edge_list"].copy()
        wel[cacheObject["firstGroupIndex"]].update(wel[cacheObject["firstGroupIndex"]].map(cacheObject["rowMap"]))
        wel[cacheObject["secondGroupIndex"]].update(wel[cacheObject["secondGroupIndex"]].map(cacheObject["colMap"]))
        #ret = wel.as_matrix().tolist()
        ret = wel.values.tolist()

        clusters = self.getElementsbyCluster(cacheObject)

        return {"data": ret, "clusters": clusters}
        # return {"data": ret, "clusters": clusters, "rows": [[k,v] for k,v in cacheObject["row_sums_map"].items()], "columns": [[k,v] for k,v in cacheObject["column_sums_map"].items()]}

    def getElementsbyCluster(self, cacheObject):
        inv_rowMap = {}
        for k, v in cacheObject["rowMap"] .items():
            inv_rowMap.setdefault(v, []).append(k)

        inv_colMap = {}
        for k, v in cacheObject["colMap"].items():
            inv_colMap.setdefault(v, []).append(k)

        clusters = {}
        for label in inv_rowMap:
            clusters[label] = {
                "rows": {k: cacheObject["row_sums_map"][k] for k in inv_rowMap[label] if k in cacheObject["row_sums_map"]},
                "columns": {k: cacheObject["column_sums_map"][k] for k in inv_colMap[label] if k in cacheObject["column_sums_map"]}
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
