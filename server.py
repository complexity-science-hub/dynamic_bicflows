import datetime

import BTrees
import transaction
from flask import Flask, render_template, request
import json
import pandas as pd
from BiCluster import *
import ZODB, ZODB.FileStorage
import dataset
import uuid
import os

app = Flask(__name__)
app.debug = True

cacheObject = {}

curPath = os.path.dirname(__file__)

connection = ZODB.connection(os.path.join(curPath, 'database/db.fs'))
dbRoot = connection.root

if not hasattr(dbRoot, 'dataSets'):
	dbRoot.dataSets = BTrees.OOBTree.BTree()


@app.route("/", methods=['GET', 'POST'])
def output():
	return render_template('dataupload.html')


def checkDataCache(dataId):
	if (dataId in cacheObject):
		return

	print("reload data into cache")
	return getData(dataId)


@app.route("/<string:dataId>", methods=['GET', 'POST'])
def dataById(dataId):
	if dbRoot.dataSets.has_key(dataId):
		dbRoot.dataSets[dataId].lastRequestDateTime = datetime.datetime.now()
		transaction.commit()
		return render_template('index.html')
	else:
		return render_template('index.html')


@app.route("/createDataset", methods=['POST'])
def createDataSet():
	receivedData = request.get_json()
	uid = uuid.uuid1().hex
	print("hello dataset, id = " + uid)
	file = os.path.join(curPath, "uploads/" + uid)
	with open(file, 'wb+') as f:
		f.write(receivedData["fileData"].encode("utf-8"))

	dbRoot.dataSets[uid] = dataset.DataSet(receivedData, file)
	transaction.commit()
	return json.dumps(uid)


@app.route("/datasets", methods=['GET'])
def getDataSets():
	global cacheObject

	res = "<table border='1'><tr>"
	res = res + "<th>ID</th>"
	res = res + "<th>originalFilename</th>"
	res = res + "<th>creationDateTime</th>"
	res = res + "<th>lastRequestDateTime</th>"
	res = res + "<th>currently cached</th>"
	res = res + "</tr>"

	for dataSet in dbRoot.dataSets:
		res = res + "<tr>"
		res = res + "<td><a href='./" + dataSet + "'>" + dataSet + "</a></td>"
		res = res + "<td>" + dbRoot.dataSets[dataSet].originalFilename + "</td>"
		res = res + "<td>" + dbRoot.dataSets[dataSet].creationDateTime.strftime("%m/%d/%Y, %H:%M:%S") + "</td>"
		res = res + "<td>" + dbRoot.dataSets[dataSet].lastRequestDateTime.strftime("%m/%d/%Y, %H:%M:%S") + "</td>"

		if (dataSet in cacheObject):
			res = res + '<td align="center">x</td>'
		else:
			res = res + "<td></td>"

		res = res + "</tr>"

	res = res + "</table>"

	return res

@app.route("/clearcache", methods=['GET'])
def clearDataCache():
	global cacheObject
	cacheObject = {}
	return "cache cleared"


@app.route("/datacache", methods=['GET'])
def getDataCache():
	global cacheObject

	res = "<table border='1'><tr>"
	res = res + "<th>ID</th>"
	res = res + "<th>originalFilename</th>"
	res = res + "<th>creationDateTime</th>"
	res = res + "<th>lastRequestDateTime</th>"
	res = res + "</tr>"

	for dataSet in cacheObject:
		res = res + "<tr>"
		res = res + "<td><a href='./" + dataSet + "'>" + dataSet + "</a></td>"
		res = res + "<td>" + dbRoot.dataSets[dataSet].originalFilename + "</td>"
		res = res + "<td>" + dbRoot.dataSets[dataSet].creationDateTime.strftime("%m/%d/%Y, %H:%M:%S") + "</td>"
		res = res + "<td>" + dbRoot.dataSets[dataSet].lastRequestDateTime.strftime("%m/%d/%Y, %H:%M:%S") + "</td>"
		res = res + "</tr>"

	res = res + "</table>"

	return res

@app.route("/getValueFormat/<string:dataId>", methods=['GET'])
def getValueUnit(dataId):
	if dbRoot.dataSets.has_key(dataId):
		res = {"unit": dbRoot.dataSets[dataId].unit,
			   "decimals": dbRoot.dataSets[dataId].decimals,
			   "unitSpace": dbRoot.dataSets[dataId].unitSpace,
			   "unitPosition": dbRoot.dataSets[dataId].unitPosition}
		return json.dumps(res)
	else:
		return json.dumps("")


@app.route("/getData/<string:dataId>", methods=['GET'])
def getData(dataId):
	global cacheObject

	if (dataId in cacheObject):
		return cacheObject[dataId]["dataset"].to_json(orient='records')

	if dbRoot.dataSets.has_key(dataId):
		cacheObject[dataId] = {}
		cacheObject[dataId]["dataset"] = pd.read_csv(dbRoot.dataSets[dataId].file, ";")

		dataKeys = cacheObject[dataId]["dataset"].keys();
		firstGroupIndex = dataKeys[0]
		secondGroupIndex = dataKeys[len(dataKeys) - 2]

		cacheObject[dataId]["dataset"][firstGroupIndex] = cacheObject[dataId]["dataset"][firstGroupIndex].astype(str)
		cacheObject[dataId]["dataset"][secondGroupIndex] = cacheObject[dataId]["dataset"][secondGroupIndex].astype(str)

		return cacheObject[dataId]["dataset"].to_json(orient='records')
	else:
		return json.dumps({"errorCode": 1, "message": "Dataset with id " + dataId + " not found"})


@app.route("/getClusters/<string:dataId>/<int:numClusters>", methods=['GET', 'POST'])
def getClusters(dataId, numClusters):
	checkDataCache(dataId)

	if request.method == 'GET':
		cluster_idcs = BiCluster().cluster(cacheObject[dataId]["dataset"], cacheObject[dataId], numClusters)
		# json.dump(cluster_idcs, open("static/data/data.json", 'w'))
		# cluster_idcs = json.load(open("static/data/data.json"))
		return json.dumps(cluster_idcs)
	else:
		json_dict = request.get_json()
		filteredData = BiCluster().filterData(cacheObject[dataId]["dataset"], json_dict)
		# cluster_idcs = BiCluster().cluster(pd.DataFrame(json_dict))
		cluster_idcs = BiCluster().cluster(filteredData, cacheObject[dataId], numClusters)
		#print(cluster_idcs)
		return json.dumps(cluster_idcs)


@app.route("/getSubClusters/<string:dataId>/<cID>/<int:numClusters>", methods=['GET'])
def getSubClusters(dataId, cID, numClusters):
	print(cID)

	clusterID_array = [int(x) for x in cID.split('.')]

	for i, cID in enumerate(clusterID_array[0:]):
		smID = '.'.join(str(x) for x in clusterID_array[:(i + 1)])
		cluster_idcs = BiCluster().subcluster3(smID, cacheObject[dataId], numClusters)

	#cluster_idcs = BiCluster().subcluster3(cID, cacheObject[dataId], numClusters)
	return json.dumps(cluster_idcs)


@app.route("/removeSubClusters/<string:dataId>/<string:cID>/<int:numClusters>", methods=['GET'])
def removeSubClusters(dataId, cID, numClusters):
	getSubClusters(dataId, cID, numClusters)

	cluster_idcs = BiCluster().removeSubClusters3(cID, cacheObject[dataId])
	return json.dumps(cluster_idcs)


# @app.route("/setNumClusters", methods=['POST'])
# def setNumClusters():
# 	BiCluster().setNumClusters(request.get_json())
# 	return ""


if __name__ == "__main__":
	# app.run()
	# app.run(host='0.0.0.0',port=5000)
	app.run(host='localhost', port=5001)
