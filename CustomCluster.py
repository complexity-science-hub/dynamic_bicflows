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

class CustomCluster(object):
    def __init__(self):
        pass

    def cluster(self, data, tempMem, num_clusters):
        #global weighted_edge_list, tempMem["firstGroupIndex"], tempMem["secondGroupIndex"], tempMem["valueIndex"], tempMem["matrix"], tempMem["model"], tempMem["row_order"], tempMem["column_order"], tempMem["rowMap"], tempMem["colMap"], tempMem["subModels"], tempMem["subModels"], tempMem["column_sums_map"]
        tempMem["subModels"] = {}

        dataKeys = data.keys();

        tempMem["firstGroupIndex"] = dataKeys[0]

        tempMem["secondGroupIndex"] = dataKeys[len(dataKeys) - 3]
        tempMem["valueIndex"] = dataKeys[len(dataKeys) - 2]
        tempMem["clusterIndex"] = dataKeys[len(dataKeys) - 1]

        # num_clusters = 9
        tempMem["weighted_edge_list"] = data[[tempMem["firstGroupIndex"],tempMem["secondGroupIndex"],tempMem["valueIndex"],tempMem["clusterIndex"]]]

        #tempMem["weighted_edge_list"] = tempMem["weighted_edge_list"].groupby(by = [tempMem["firstGroupIndex"], tempMem["secondGroupIndex"], tempMem["clusterIndex"]]).sum().reset_index()

        firstGroupClusterWeights = tempMem["weighted_edge_list"].groupby(
            by=[tempMem["firstGroupIndex"],
                tempMem["clusterIndex"]]).sum().sort_values(tempMem["valueIndex"], ascending=False).reset_index().drop_duplicates([tempMem["firstGroupIndex"]])

        secondGroupClusterWeights = tempMem["weighted_edge_list"].groupby(
            by=[tempMem["secondGroupIndex"],
                tempMem["clusterIndex"]]).sum().sort_values(tempMem["valueIndex"], ascending=False).reset_index().drop_duplicates([tempMem["secondGroupIndex"]])

        tempMem["weighted_edge_list"] = data[
            [tempMem["firstGroupIndex"], tempMem["secondGroupIndex"], tempMem["valueIndex"]]]

        firstGroupWeights = tempMem["weighted_edge_list"].groupby(
            by=[tempMem["firstGroupIndex"]]).sum().reset_index()

        secondGroupWeights = tempMem["weighted_edge_list"].groupby(
            by=[tempMem["secondGroupIndex"]]).sum().reset_index()

        clusters = {}
        tempMem["rowMap"] = {}
        tempMem["colMap"] = {}

        for index, row in firstGroupClusterWeights.iterrows():
            clusterLabel = str(row[tempMem["clusterIndex"]])
            itemName = str(row[tempMem["firstGroupIndex"]])
            itemValue = firstGroupWeights.loc[firstGroupWeights[tempMem["firstGroupIndex"]] == itemName].iloc[0][tempMem["valueIndex"]]
            if str(clusterLabel) not in clusters:
                clusters[clusterLabel] = {"rows": {}, "columns": {}}

            clusters[clusterLabel]["rows"][itemName] = float(itemValue)
            tempMem["rowMap"][itemName] = clusterLabel

        for index, row in secondGroupClusterWeights.iterrows():
            clusterLabel = str(row[tempMem["clusterIndex"]])
            itemName = str(row[tempMem["secondGroupIndex"]])
            itemValue = secondGroupWeights.loc[secondGroupWeights[tempMem["secondGroupIndex"]] == itemName].iloc[0][tempMem["valueIndex"]]
            if str(clusterLabel) not in clusters:
                clusters[clusterLabel] = {"rows": {}, "columns": {}}

            clusters[clusterLabel]["columns"][itemName] = float(itemValue)
            tempMem["colMap"][itemName] = clusterLabel

        tempMem["weighted_edge_list"] = tempMem["weighted_edge_list"].groupby(
            by=[tempMem["firstGroupIndex"], tempMem["secondGroupIndex"]]).sum().reset_index()

        wel = tempMem["weighted_edge_list"].copy()
        wel[tempMem["firstGroupIndex"]].update(wel[tempMem["firstGroupIndex"]].map(tempMem["rowMap"]))
        wel[tempMem["secondGroupIndex"]].update(wel[tempMem["secondGroupIndex"]].map(tempMem["colMap"]))
        # ret = wel.as_matrix().tolist()
        ret = wel.values.tolist()

        return {"data": ret, "clusters": clusters}

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
