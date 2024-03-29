var locale = d3.formatLocale({
  decimal: ".",
  thousands: ",",
  grouping: [3],
});

var dataId;

function initMaterial() {
    var elems = document.querySelectorAll('select');
    var instances = M.FormSelect.init(elems);

    var elems = document.querySelectorAll('.modal');
    var instances = M.Modal.init(elems, {
        onCloseEnd: function() {
            window.location.href = dataId;
        }
    });
}

document.addEventListener("DOMContentLoaded", function() {
    initMaterial();

    const submitBtn = document.getElementById('submit');
    submitBtn.disabled = true;

    submitBtn.addEventListener('click', submit, false);

    const fileUpload = document.getElementById('upload');
    fileUpload.addEventListener('change', fileSelected, false);

    const unit = document.getElementById('unit');
    const decimals = document.getElementById('decimals');
    const unitSpace = document.getElementById('unit_space');
    const unitPosition = document.getElementById('unit_position');
    const formatPreview = document.getElementById('formatPreview');
    const urlInfoModal = document.getElementById('urlInfoModal');
    const urlInfoModalText = document.getElementById('urlInfoModalText');
    const encrypt = document.getElementById('encrypt');
    const pwdArea = document.getElementById('pwdArea');
    const pwd = document.getElementById('pwd');
    const customClustering = document.getElementById('custom_clustering');
    const headerNoCustomClustering = document.getElementById('header-no-custom-clustering');
    const headerCustomClustering = document.getElementById('header-custom-clustering');

    customClustering.addEventListener('input', toggleCustomClustering, false);
    toggleCustomClustering();

    encrypt.addEventListener('input', toggleEncrypt, false);
    toggleEncrypt();

    unit.addEventListener('input', updateFormatPreview, false);
    decimals.addEventListener('input', updateFormatPreview, false);
    unitSpace.addEventListener('input', updateFormatPreview, false);
    unitPosition.addEventListener('change', updateFormatPreview, false);

    updateFormatPreview();

    function fileSelected(evt) {
        submitBtn.disabled = false;
    }

    function toggleCustomClustering(evt) {
        if (customClustering.checked) {
            headerNoCustomClustering.classList.add("hide");
            headerCustomClustering.classList.remove("hide");
        } else {
            headerNoCustomClustering.classList.remove("hide");
            headerCustomClustering.classList.add("hide");
        }
    }

    function toggleEncrypt(evt) {
        if (encrypt.checked) {
            pwdArea.classList.remove("hide");
        } else {
            pwdArea.classList.add("hide");
        }
    }

    function updateFormatPreview(evt) {
        let res = 1234;

        if (decimals.value && !isNaN(decimals.value)) {
            res = locale.format(",." + decimals.value + "f")(res);
        } else {
            res = locale.format(",")(res);
        }

        if (unit) {
            if (unitPosition.value == 'left') {
                if (unitSpace.checked) {
                    res = unit.value + " " + res;
                } else {
                    res = unit.value + res;
                }
            } else {
                if (unitSpace.checked) {
                    res = res + " " + unit.value;
                } else {
                    res = res + unit.value;
                }
            }
        }

        formatPreview.textContent = res;
    }

    function submit(evt) {
        submitBtn.disabled = true;

        let file = fileUpload.files[0];
        let reader = new FileReader();

        let sendData = {};
        sendData.name = file.name;
        sendData.date = file.lastModified;
        sendData.size = file.size;
        sendData.type = file.type;
        sendData.unit = unit.value;
        sendData.decimals = decimals.value;
        sendData.unitSpace = unitSpace.checked;
        sendData.unitPosition = unitPosition.value;
        sendData.encrypt = encrypt.checked;
        sendData.pwd = pwd.value;
        sendData.customClustering = customClustering.checked;

        reader.onload = function(fileData) {
          sendData.fileData = fileData.target.result;

          d3.json("createDataset")
            .header("Content-Type", "application/json")
            .post(JSON.stringify(sendData), function(id){
                dataId = id;

                let location = window.location + id;

                urlInfoModalText.innerHTML = "You can now access the bipartite graph with this dataset directly via: <br><a href = '" + location +"'<b>" + location + "</b></a>";

                let modalInstance = M.Modal.getInstance(urlInfoModal);
                modalInstance.open();

                //alert("Dataset uploaded. You can now access the bipartite graph with this dataset directly via:\n\n" + window.location + "/" + id);
                //window.location.href = id;
            });
        }

        reader.readAsText(file);
    }
});