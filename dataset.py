import persistent
import datetime


class DataSet(persistent.Persistent):

    def __init__(self, data, file):
        self.originalFilename = data["name"]
        self.file = file
        self.unit = data["unit"]
        self.decimals = data["decimals"];
        self.unitSpace = data["unitSpace"];
        self.unitPosition = data["unitPosition"];
        self.creationDateTime = datetime.datetime.now()
        self.lastRequestDateTime = datetime.datetime.now()
