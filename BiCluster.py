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

    def subcluster3(self, clusterID):
        global subModels

        clusterID_array = [int(x) for x in clusterID.split('.')]
        # print(clusterID_array)
        # print("subModels",subModels)
        subMatrix = model.get_submatrix(matrix,clusterID_array[0])
        sub_row_order = row_order[model.get_indices(clusterID_array[0])[0]]
        sub_column_order = column_order[model.get_indices(clusterID_array[0])[1]]

        for i, cID in enumerate(clusterID_array[1:]):
            smID = '.'.join(str(x) for x in clusterID_array[:(i+1)])
            print("smID",smID)
            sm = subModels[smID]
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

        subModels[clusterID] = subModel
        # print("subModels",subModels)
        subModel.fit(subMatrix)

        for i, label in enumerate(subModel.row_labels_):
            rowMap[sub_row_order[i]] = str(clusterID)+"."+str(label)

        for i, label in enumerate(subModel.column_labels_):
            colMap[sub_column_order[i]] = str(clusterID)+"."+str(label)

        # ret = []
        # wel = weighted_edge_list.copy()
        # wel[firstGroupIndex].update(wel[firstGroupIndex].map(rowMap))
        # wel[secondGroupIndex].update(wel[secondGroupIndex].map(colMap))

        rowLabelSet = set([str(clusterID)+"."+str(x) for x in subModel.row_labels_])
        colLabelSet = set([str(clusterID)+"."+str(x) for x in subModel.column_labels_])
        #---

        rowMap2 = {k:(v if v in rowLabelSet else "Sonstige") for k,v in rowMap.items()}
        colMap2 = {k:(v if v in colLabelSet else "Sonstige") for k,v in colMap.items()}

        wel = weighted_edge_list.copy()
        # print(rowLabelSet)

        wel[firstGroupIndex].update(wel[firstGroupIndex].map(rowMap2))
        wel[secondGroupIndex].update(wel[secondGroupIndex].map(colMap2))

        idc = wel[(wel[firstGroupIndex].astype(str).str[:len(clusterID)] != clusterID) & (wel[secondGroupIndex].astype(str).str[:len(clusterID)] != clusterID)].index
        wel = wel.drop(idc)

        wel2 = weighted_edge_list.copy()
        wel2 = wel2.drop(idc)
        row_sums_map2 = wel2.groupby(by = [firstGroupIndex]).sum().to_dict()[valueIndex]
        row_sums_map2 = {k:float(v) for k,v in row_sums_map2.items()}
        column_sums_map2 = wel2.groupby(by = [secondGroupIndex]).sum().to_dict()[valueIndex]
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
        # return {"data": ret, "clusters": clusters, "rows": [[k,v] for k,v in row_sums_map.items()], "columns": [[k,v] for k,v in column_sums_map.items()]}

    def removeSubClusters3(self, clusterID):
        smID = clusterID[:clusterID.rfind(".")]

        for key, value in rowMap.items():
            if(rowMap[key].startswith(clusterID)):
                rowMap[key] = clusterID

        for key, value in colMap.items():
            if(colMap[key].startswith(clusterID)):
                colMap[key] = clusterID

        rowMap2 = {k:(v if v.startswith(smID) else "Sonstige") for k,v in rowMap.items()}
        colMap2 = {k:(v if v.startswith(smID) else "Sonstige") for k,v in colMap.items()}


        wel = weighted_edge_list.copy()

        wel[firstGroupIndex].update(wel[firstGroupIndex].map(rowMap2))
        wel[secondGroupIndex].update(wel[secondGroupIndex].map(colMap2))

        idc = wel[(wel[firstGroupIndex].astype(str).str[:len(smID)] != smID) & (wel[secondGroupIndex].astype(str).str[:len(smID)] != smID)].index
        wel = wel.drop(idc)

        wel2 = weighted_edge_list.copy()
        wel2 = wel2.drop(idc)
        row_sums_map2 = wel2.groupby(by = [firstGroupIndex]).sum().to_dict()[valueIndex]
        row_sums_map2 = {k:float(v) for k,v in row_sums_map2.items()}
        column_sums_map2 = wel2.groupby(by = [secondGroupIndex]).sum().to_dict()[valueIndex]
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
        # return {"data": ret, "clusters": clusters, "rows": [[k,v] for k,v in row_sums_map.items()], "columns": [[k,v] for k,v in column_sums_map.items()]}

    def cluster(self, data):
        global weighted_edge_list, firstGroupIndex, secondGroupIndex, valueIndex, matrix, model, row_order, column_order, rowMap, colMap, subModels, row_sums_map, column_sums_map
        subModels = {}

        dataKeys = data.keys();
        firstGroupIndex = dataKeys[0]
        secondGroupIndex = dataKeys[len(dataKeys) - 2]
        valueIndex = dataKeys[len(dataKeys) - 1]

        print("the keys: ")
        print(firstGroupIndex)
        print(secondGroupIndex)
        print(valueIndex)
        # num_clusters = 9
        weighted_edge_list = data[[firstGroupIndex,secondGroupIndex,valueIndex]]
        weighted_edge_list = weighted_edge_list.groupby(by = [firstGroupIndex, secondGroupIndex]).sum().reset_index()

        G = nx.from_pandas_dataframe(weighted_edge_list,firstGroupIndex,secondGroupIndex,valueIndex, create_using=nx.DiGraph())
        row_order = np.sort(np.unique(weighted_edge_list[firstGroupIndex]))
        column_order = np.sort(np.unique(weighted_edge_list[secondGroupIndex]))
        matrix_real = biadjacency_matrix(G, row_order, column_order=column_order, weight=valueIndex)
        matrix = matrix_real.toarray()
        row_sums = matrix.sum(axis=1).round(2)
        row_sums_map = dict(zip(row_order, row_sums))
        row_sums_map = {k:float(v) for k,v in row_sums_map.items()}
        column_sums = matrix.sum(axis=0).round(2)
        column_sums_map = dict(zip(column_order, column_sums))
        column_sums_map = {k:float(v) for k,v in column_sums_map.items()}

        model = CoclustMod(min(min(matrix.shape), num_clusters),random_state=0) #n_init=500
        model.fit(matrix)

        #test andere liste senden
        rowMap = dict(zip(row_order, list(map(str, model.row_labels_))))
        colMap = dict(zip(column_order, list(map(str,model.column_labels_))))
        ret = []

        wel = weighted_edge_list.copy()
        wel[firstGroupIndex].update(wel[firstGroupIndex].map(rowMap))
        wel[secondGroupIndex].update(wel[secondGroupIndex].map(colMap))
        ret = wel.as_matrix().tolist()

        clusters = self.getElementsbyCluster()

        return {"data": ret, "clusters": clusters}
        # return {"data": ret, "clusters": clusters, "rows": [[k,v] for k,v in row_sums_map.items()], "columns": [[k,v] for k,v in column_sums_map.items()]}

    def getElementsbyCluster(self):
        inv_rowMap = {}
        for k, v in rowMap.items():
            inv_rowMap.setdefault(v, []).append(k)

        inv_colMap = {}
        for k, v in colMap.items():
            inv_colMap.setdefault(v, []).append(k)

        clusters = {}
        for label in inv_rowMap:
            clusters[label] = {
                "rows": {k: row_sums_map[k] for k in inv_rowMap[label] if k in row_sums_map},
                "columns": {k: column_sums_map[k] for k in inv_colMap[label] if k in column_sums_map}
            }
        return clusters

    def setNumClusters(self, num):
        global num_clusters
        num_clusters = num
        # return ""

    def filterData(self, data, filters):
        data_tmp = data.copy()
        for f in filters:
            data_tmp = data_tmp[data_tmp[f].isin(filters[f])]

        return data_tmp
