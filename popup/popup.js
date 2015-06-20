var addRule = new(function(){
	"usestrict";
	var me = this,
		table       = $(".table"),
		tr          = $(".table tr"),
		ruleName    = $("#rule-name"),
		patternRx   = $("#pattern"),
		imageHeight = $("#image-height"),
		imageWidth  = $("#image-width"),
		addBtn      = $(".add-btn"),
		deleteBtn   = $(".delete-btn"),
		saveBtn     = $(".save-btn"),
		poweringOff = $(".power-off");

	function addRow(){
		var nextRow = table[0].rows.length,
			row             = table[0].insertRow(nextRow),
			cell1           = row.insertCell(0),
			cell2           = row.insertCell(1),
			cell3           = row.insertCell(2),
			cell4           = row.insertCell(3);

		cell1.innerHTML = nextRow;
		cell2.innerHTML = ruleName.val();
		cell3.innerHTML = patternRx.val();
		cell4.innerHTML = imageWidth.val()+" x "+imageHeight.val();

		//New Dom Iteration so Bind and unbind events and clear Cache.
		$(".table tr").off("click",highlightRow);
		$(".table tr").on("click",highlightRow);
	}

	function highlightRow(){
		if(!$(this).hasClass("uneditable")){
			if($(this).hasClass("warning")){
				$(this).removeClass("warning");
			}else{
				$(this).addClass("warning");
			}
		}
	}

	function deleteAllRows(){
		$.each($(".table tr"),function(index,value){
			if(!($(this).hasClass("uneditable"))){
				$(this).remove();
			}
		});
	}

	function deleteRow(){
		$(".warning").remove();
		var rowLength = $(".table")[0].rows.length-1;

		for(var i = 1; i<= rowLength;){
			var x = $(".table")[0].rows[i].cells[0];
			x.innerHTML = i;
			i++
		}
	}

	function packageDataToSend(){
		var data ={
			table:[],
			fileName              :$("#file-name").val(),
			folderPath            :$("#folder-path").val(),
			appStatus             :$(".app-status").attr("status")
		};
		var rowLength = $(".table")[0].rows.length-1;
		for(var i = 1; i<= rowLength;){
			var col = [];
			for(var y=1;y<=3;){
				var x = $(".table")[0].rows[i].cells[y];
				col.push(x.innerHTML);
				y++;
			}
			data.table.push(col);
			i++;
		}
		return data;
	}

	function powerOff(){
		var cacheSav =  $(".app-status"),
			flag = cacheSav.attr("status");

		var text1="",
			text2="";
		console.log("Status"+flag);
		if(flag == "true"){
			text1 = "Powering Off";
			text2 = "Good Bye!";
			flag = "false";
			cacheSav.attr("status",flag);
		}else{
			text1 = "Powering On";
			text2 = "We are live!";
			flag = "true";
			cacheSav.attr("status",flag);
		}

		cacheSav.html(text1);

		cacheSav.show().animate({"opacity":"1"});

		var y = setTimeout(function(){
			cacheSav.html(text2);
			clearTimeout(y);
		},1000);

		var x = setTimeout(function(){
			cacheSav.animate({"opacity":"0"}, function () {
				$(this).hide();
			});
			clearTimeout(x);
            if(flag == "true"){
                chrome.browserAction.setIcon({path:"/assets/icons/on-32.png"}); //on off
            }else{
                chrome.browserAction.setIcon({path:"/assets/icons/off-32.png"}); //on off
                chrome.downloads.setShelfEnabled(true);
            }
		},1500);

        indexDbGetData("options",saveAppStatus,flag);
	}

    function saveAppStatus(data,flag){
        if(typeof  data !== "undefined" || data !== null){
            data.appStatus = flag;
            var jsonData = {};
            jsonData["options"] = data;
            chrome.storage.sync.set(jsonData,function(){
               console.log("App State - Powered Off");
            });
        }
    }

	function save(){
		var text = "Saving...",
			cacheSav = $(".saving-options");

		cacheSav.html(text);

		cacheSav.show().animate({"opacity":"1"});

		var y = setTimeout(function(){
			var text = "Saved!";
			cacheSav.html(text);
			clearTimeout(y);
		},1000);

		var x = setTimeout(function(){
			cacheSav.animate({"opacity":"0"}, function () {
				$(this).hide();
			});
			clearTimeout(x);
		},1500);
		console.log(packageDataToSend());
		//service.send(service.sendDataFromSettingToApp,packageDataToSend());
		indexDbSaveData("options",packageDataToSend())
	}

	function clearAllFields(){
		deleteAllRows();
		patternRx.val("");
		ruleName.val("");
		imageHeight.val("");
		imageWidth.val("");
		$("#file-name").val("");
		$("#folder-path").val("");
	}

	function load_data(data){
		if(typeof  data !== "undefined" || data !== null){
			clearAllFields();
			var rowLength = data.table.length;
			for(var i=0;i<rowLength;){
				var rowCount = i+ 1,
					row   = $(".table")[0].insertRow(rowCount),
					cell0 = row.insertCell(0);
				cell0.innerHTML = (rowCount);
				for(var y=0;y<=2;){
					var cellCount = y+1;
					var cell = row.insertCell(cellCount);
					cell.innerHTML = data.table[i][y];
					y++;
				}
				i++;
			}
			$("#file-name").val(data.fileName);
			$("#folder-path").val(data.folderPath);
			$(".table tr").on("click",highlightRow);
			$(".app-status").attr("status",data.appStatus);
		}
	}

	function indexDbGetData(objectName,cbk,flag){
		chrome.storage.sync.get(objectName,function(data){
			cbk(data[objectName],flag);
		});
	}

	// Save it using the Chrome extension storage API.
	function indexDbSaveData(key,objectJSON,cbk){ //objectJSON = {'value': theValue}
		var jsonData = {};
		jsonData[key] = objectJSON;
		chrome.storage.sync.set(jsonData,function(response){
			cbk;
		});
	}

	this.init = function(){
		addBtn.on("click",addRow);
		tr.on("click",highlightRow);
		deleteBtn.on("click",deleteRow);
		saveBtn.on('click',save);
		poweringOff.on('click',powerOff);

		indexDbGetData("options",load_data);

		console.log($(".app-status").attr("status"));
	};
});
addRule.init();