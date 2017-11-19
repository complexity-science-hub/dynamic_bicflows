from flask import Flask, render_template, request
import json
import pandas as pd
from BiCluster import *

app = Flask(__name__)
app.debug = True

data = 0

@app.route("/", methods=['GET', 'POST'])
def output():
	return render_template('index.html')

@app.route("/getData", methods=['GET'])
def getData():
	global data
	data = pd.read_table("static/data/data_20123-20172.csv",";")
	return data.to_json(orient='records')

@app.route("/getDummyData", methods=['GET'])
def getDummyData():
	global data
	data = pd.read_table("static/data/dummy.csv",";")
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
	app.run(host='localhost',port=5001)
