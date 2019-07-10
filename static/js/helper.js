var cvs = document.createElement('canvas');
var ctx = cvs.getContext('2d');
// ctx.font = fontSize + 'px ' + fontFace;
ctx.font = "12px sans-serif";
var maxLength = 50;

String.prototype.trunc = String.prototype.trunc ||
      function(){
        txtW = getTextWidth(this);
        mx = (maxLength*this.length)/txtW - 5;
        if(this.startsWith("[")){
          return (txtW > maxLength) ? this.substr(0, mx-1) + '...]' : this;
        }
        else
          return (txtW > maxLength) ? this.substr(0, mx-1) + '...' : this;
        // return (txtW > maxLength) ? this.substr(0, mx/2) + '...' + this.substr(-mx/2): this;
      };

function setMaxLabelLength(len){
  maxLength = len;
}

function getTextWidth(txt){
  return ctx.measureText(txt).width;
}

// FORMATTER
var locale = d3.formatLocale({
  decimal: ".",
  thousands: ",",
  grouping: [3],
});

function format2(x) {
  var s = d3.format(".2s")(x);
  switch (s[s.length - 1]) {
    case "G": return s.slice(0, -1) + " bill.";
    case "M": return s.slice(0, -1) + " mill.";
    case "k": return s.slice(0, -1) + " thous.";
  }
  return s;
}

// TIMEDELAY
var delay = 750;

// LABELING
var lineSpace = 8;
var fontsize = 12 + lineSpace;
