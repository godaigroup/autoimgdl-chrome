var eventPage = new (function() {

    var globalStorageFlagDownloadData = false;

	var localData ={
		table                 :[],
		fileName              :"",
		folderPath            :"",
		appStatus             :false
	};

	function openOptions(){
		chrome.browserAction.onClicked.addListener(function(tab) {
			chrome.tabs.create({'url': chrome.extension.getURL('popup/popup.html')}, function(tab) {
				// Tab opened.
			});
		});
	}



	function indexDbGetData(objectName,cbk){
		chrome.storage.sync.get(objectName,function(data){
				localData.appStatus = data[objectName].appStatus;
				localData.fileName  = data[objectName].fileName;
				localData.folderPath= data[objectName].folderPath;
				localData.table     = data[objectName].table;
			cbk(data[objectName]);
		});
	}

	function listenCommWithContentScript(){
		chrome.runtime.onMessage.addListener(
			function(request, sender, sendResponse) {
				if (request.start == "initial"){
					indexDbGetData("options",sendResponse);
					return true;
				} else if(request.startDownload ==  true){
					var imgData              = request.imgData,
						ruleName             = request.ruleName,
						urlObj               = request.urlObj,
						processQue           = request.processQue,
						globalImageArr     = request.globalImageArray,
						downloadCounter  = request.downloadCounter;
						downloadFile(imgData,ruleName,urlObj,processQue,globalImageArr,downloadCounter,sendResponse);
                    return true;
				}
			});
	}

	function detectStorageLocation(imgData,ruleName,urlObj){
		var data = localData,
			folderPathArr = data.folderPath.trim().split("\\"),
			//drive = folderPathArr.shift(),
			locationString = "";

		//console.log("detectData:"+data.folderPath);
		//console.log("Arr"+folderPathArr);
		var imgUrl = urlObj;

		var url      = imgData.src,
			filename = url.substring(url.lastIndexOf('/')+1);

		var fileExt = imgData.ext;

		if((/jpg|jpeg|png|gif|tif/i).test(filename)){
			filename = filename.substring(0,filename.lastIndexOf('.'));
		}

		for( var i=0; i<folderPathArr.length; i++){
			if(folderPathArr[i].length>0){
				if(folderPathArr[i] == "%imgdomain%"){
					locationString = locationString + "/"+ imgUrl.hostname;
				} else if(folderPathArr[i] == "%sitedomain%"){
					locationString = locationString + "/"+ imgUrl.windowHost;
				}
				else if(folderPathArr[i] == "%rulename%"){
					if(ruleName.length>0){
						locationString = locationString + "/" + ruleName;
					} else {}
				} else if(folderPathArr[i] == "%dimensions%"){
					locationString = locationString + "/" + imgData.width+"x"+imgData.height;
				} else if(folderPathArr[i] == "%original%"){
					locationString = locationString + "/" + filename;
				} else if(folderPathArr[i] == "%ext%") {
					locationString = locationString + "/" + fileExt;
				} else {
					locationString = locationString + "/" + folderPathArr[i].replace(/\//g,"");
				}
			}
		}

		//drive = drive.replace(/\\/g,"");
		//locationString = drive+locationString;
		//console.log("location:"+locationString);
		return locationString;
	}

	function detectFileName(imgData,ruleName,urlObj){
		var data = localData,
			fileNameType = data.fileName.trim().split("%"),
			locationString = "";

		var url      = imgData.src,
			filename = url.substring(url.lastIndexOf('/')+1);

		var fileExt = imgData.ext;

		if((/jpg|jpeg|png|gif|tif/i).test(filename)) {
			filename = filename.substring(0, filename.lastIndexOf('.'));
		}

		for( var i=0; i<fileNameType.length; i++) {
			if(fileNameType[i].length>0) {
				if (fileNameType[i] == "imgdomain") {
					locationString = locationString + urlObj.hostname;
				} else if(fileNameType[i] == "sitedomain"){
					locationString = locationString + urlObj.windowHost;
				}
				else if (fileNameType[i] == "rulename") {
					if (ruleName.length > 0) {
						locationString = locationString + ruleName;
					} else {
					}
				} else if (fileNameType[i] == "dimensions") {
					locationString = locationString + imgData.width + "x" + imgData.height;
				} else if (fileNameType[i] == "ext") {
					locationString = locationString + fileExt;
				} else if (fileNameType[i] == "original") {
					locationString = locationString + filename;
				} else {
					locationString = locationString + fileNameType[i].replace(/\//g, "");
				}
			}
		}
		return locationString+"."+fileExt;
	}


    function downloadFileInFolder(location,fileName,imgData,processQue,globalImageArr,downloadConunter,sendResponse){
        chrome.downloads.setShelfEnabled(false);
        var downloadName = location+"/"+fileName;
        chrome.downloads.download({
            url:imgData.src,
            filename: downloadName
        },function(){

            var sendNext = {
                "processQue":processQue,
                "globalImageArray":globalImageArr,
                "downloadCounter":downloadConunter
            };
            var data ={
                "url":imgData.src,
                "filename":fileName,
                "path":location
            };

            /*if(processQue <= globalImageArr.length){
                chrome.downloads.setShelfEnabled(true);
            }*/

            indexDbGetDownloadedFileData("downloadHistory", indexDbSaveDownloadedFileData,sendResponse,sendNext,data);
        });
    }

    function checkIfFileAlreadyDownloaded(location,fileName,imgData,processQue,globalImageArr,downloadConunter,sendResponse){
        chrome.storage.local.get("downloadHistory",function(data){
            var flag = true;
            $.each(data["downloadHistory"],function(index,value){
               if(  this.filename == fileName && this.path == location && this.url == imgData.src ){
                   flag = false;
                   console.log("Match found");
                   return false;
               }
            });

            if(flag){
                console.log("starting download");
                downloadFileInFolder(location,fileName,imgData,processQue,globalImageArr,downloadConunter,sendResponse);
            }
            else{
                console.log("Move to next image");
                var sendNext = {
                    "processQue":processQue,
                    "globalImageArray":globalImageArr,
                    "downloadCounter":downloadConunter
                };
                sendResponse(sendNext);
            }
        });
    }

	function downloadFile(imgData,ruleName,urlObj,processQue,globalImageArr,downloadConunter,sendResponse)
	{
		var location = detectStorageLocation(imgData,ruleName,urlObj);
        if(location.indexOf("/") || location.indexOf("\\")){
            location = location.substring(1);
        }
		var fileName = detectFileName(imgData,ruleName,urlObj);

        checkIfFileAlreadyDownloaded(location,fileName,imgData,processQue,globalImageArr,downloadConunter,sendResponse);

        //downloadFileInFolder(location,fileName,imgData,processQue,globalImageArr,downloadConunter,sendResponse);
	}

    /*function determineFilename(){
        chrome.downloads.onDeterminingFilename.addListener(function(downloadItem,suggest){
            console.log(downloadItem);
            suggest();
        });
    }*/
    function indexDbGetDownloadedFileData(objectName,cbk,sendResponse,sendNext,newData){
        chrome.storage.local.get(objectName,function(data){
            data[objectName].push(newData);
            cbk(objectName,data[objectName],sendResponse,sendNext);
        });
    }
    // Save it using the Chrome extension storage API.
    function indexDbSaveDownloadedFileData(key,objectJSON,cbk,sendNext){ //objectJSON = {'value': theValue}
        var jsonData = {};
        jsonData[key] = objectJSON;
        chrome.storage.local.set(jsonData,function(response){
            cbk(sendNext);
        });
    }

    function checkIfDownloadDataSet(objectName){
        chrome.storage.local.get(objectName,function(data){
            if( typeof data[objectName] == "undefined"){
                var jsonData = {};
                jsonData["downloadHistory"] = [];
                chrome.storage.local.set(jsonData,function(response){
                    console.log("Download data array pushed");
                });
            }
        });
    }

    function checkAppStatus(data){
        if(data.appStatus == "true"){
            chrome.browserAction.setIcon({path:"/assets/icons/on-32.png"}); //on off
        }else{
            chrome.browserAction.setIcon({path:"/assets/icons/off-32.png"}); //on off
        }
    }

	function init() {
        indexDbGetData("options",checkAppStatus);
        checkIfDownloadDataSet("downloadHistory");
		openOptions();
		listenCommWithContentScript();
	}

	init();
})();