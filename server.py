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

dataId = 0

data = 0

curPath = os.path.dirname(__file__)

connection = ZODB.connection(os.path.join(curPath, 'database/db.fs'))
dbRoot = connection.root

if not hasattr(dbRoot, 'dataSets'):
	dbRoot.dataSets = BTrees.OOBTree.BTree()


@app.route("/", methods=['GET', 'POST'])
def output():
	global dataId
	dataId = 0
	return render_template('dataupload.html')


@app.route("/<string:id>", methods=['GET', 'POST'])
def dataById(id):
	global dataId
	dataId = id

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
	res = "<table border='1'><tr>"
	res = res + "<th>ID</th>"
	res = res + "<th>originalFilename</th>"
	res = res + "<th>creationDateTime</th>"
	res = res + "<th>lastRequestDateTime</th>"
	res = res + "</tr>"

	for dataSet in dbRoot.dataSets:
		res = res + "<tr>"
		res = res + "<td><a href='./" + dataSet + "'>" + dataSet + "</a></td>"
		res = res + "<td>" + dbRoot.dataSets[dataSet].originalFilename + "</td>"
		res = res + "<td>" + dbRoot.dataSets[dataSet].creationDateTime.strftime("%m/%d/%Y, %H:%M:%S") + "</td>"
		res = res + "<td>" + dbRoot.dataSets[dataSet].lastRequestDateTime.strftime("%m/%d/%Y, %H:%M:%S") + "</td>"
		res = res + "</tr>"

	res = res + "</table>"

	return res


@app.route("/getValueFormat", methods=['GET'])
def getValueUnit():
	global dataId
	if dbRoot.dataSets.has_key(dataId):
		res = {"unit": dbRoot.dataSets[dataId].unit,
			   "decimals": dbRoot.dataSets[dataId].decimals,
			   "unitSpace": dbRoot.dataSets[dataId].unitSpace,
			   "unitPosition": dbRoot.dataSets[dataId].unitPosition}
		return json.dumps(res)
	else:
		return json.dumps("seawas")


@app.route("/getData", methods=['GET'])
def getData():
	global data
	global dataId

	if dbRoot.dataSets.has_key(dataId):
		data = pd.read_csv(dbRoot.dataSets[dataId].file, ";")
		return data.to_json(orient='records')
	else:
		return json.dumps({"errorCode": 1, "message": "Dataset with id " + dataId + " not found"})


@app.route("/getDummyData", methods=['GET'])
def getDummyData():
	global data
	data = pd.read_table("static/data/dummy.csv", ";")
	return data.to_json(orient='records')


@app.route("/getClusters", methods=['GET', 'POST'])
def getClusters():
	if request.method == 'GET':
		cluster_idcs = BiCluster().cluster(data)
		# json.dump(cluster_idcs, open("static/data/data.json", 'w'))
		# cluster_idcs = json.load(open("static/data/data.json"))
		return json.dumps(cluster_idcs)
	else:
		json_dict = request.get_json()
		filteredData = BiCluster().filterData(data, json_dict)
		# cluster_idcs = BiCluster().cluster(pd.DataFrame(json_dict))
		cluster_idcs = BiCluster().cluster(filteredData)
		return json.dumps(cluster_idcs)


@app.route("/getSubClusters/<cID>", methods=['GET'])
def getSubClusters(cID):
	print(cID)
	cluster_idcs = BiCluster().subcluster3(cID)
	return json.dumps(cluster_idcs)


@app.route("/removeSubClusters/<string:cID>", methods=['GET'])
def removeSubClusters(cID):
	print(cID)
	cluster_idcs = BiCluster().removeSubClusters3(cID)
	return json.dumps(cluster_idcs)


@app.route("/setNumClusters", methods=['POST'])
def setNumClusters():
	BiCluster().setNumClusters(request.get_json())
	return ""


if __name__ == "__main__":
	# app.run()
	# app.run(host='0.0.0.0',port=5000)
	app.run(host='localhost', port=5001)
