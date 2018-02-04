/**
 * Created by Sunny on 2018/1/31.
 */
angular.module('lufiApp.controllers', [])
    .controller('mainCtrl', function($scope) {
        window.onload = function() {
            document.addEventListener('dragover', function(e) {
                e.stopPropagation();
                e.preventDefault();
            }, false);

            document.addEventListener('drop', function(e) {
                e.stopPropagation();
                e.preventDefault();
            }, false);

        };
        $scope.myFile = null;

        var target = $(".upload-window")[0];
        target.addEventListener("dragenter", function () {
            target.style.borderColor = "#009dd7";
        });
        target.addEventListener("dragleave", function () {
            target.style.borderColor = "rgba(0, 157, 215, 0.5)";
        });
        target.addEventListener("drop", function (event) {
            $scope.myFile = event.dataTransfer.files[0];
            changeState();
        });
        $scope.getFile = function (files) {
            $scope.myFile = files[0];
            changeState();
        };

        function changeState(){
            if($scope.myFile != null){
                $(".no-file")[0].style.display = "none";
                $("#fileName")[0].innerHTML = $scope.myFile.name;
                $("#fileType")[0].innerHTML = $scope.myFile.type;
                $("#fileSize")[0].innerHTML = $scope.myFile.size + "字节";
                $(".has-file")[0].style.display = "block";

            }else{
                $(".no-file")[0].style.display = "block";
                $(".has-file")[0].style.display = "none";
            }
        }

        $scope.cancelUpload = function(){
            $scope.myFile = null;
            changeState();
        };

        $scope.uploadFile = function(){
            if($scope.myFile == null)
                alert("请先选择文件");
        }

        var md5File;
        //监听分块上传过程中的时间点
        WebUploader.Uploader.register({
            "before-send-file": "beforeSendFile",  // 整个文件上传前
            "before-send": "beforeSend",  // 每个分片上传前
            "after-send-file": "afterSendFile"  // 分片上传完毕
        }, {
            //时间点1：所有分块进行上传之前调用此函数 ，检查文件存不存在
            beforeSendFile: function (file) {
                var deferred = WebUploader.Deferred();
                md5File = hex_md5(file.name + file.size);//根据文件名称，大小确定文件唯一标记，这种方式不赞成使用
                $.ajax({
                    type: "POST",
                    url: "/checkFile",
                    data: {
                        md5File: md5File, //文件唯一标记
                    },
                    async: false,  // 同步
                    dataType: "json",
                    success: function (response) {
                        if (response) {  //文件存在，跳过 ，提示文件存在
                            $('#' + file.id).find('p.state').text("文件存在");
                        } else {
                            deferred.resolve();  //文件不存在或不完整，发送该文件
                        }
                    }
                }, function (jqXHR, textStatus, errorThrown) { //任何形式的验证失败，都触发重新上传
                    deferred.resolve();
                });
                return deferred.promise();
            },
            //时间点2：如果有分块上传，则每个分块上传之前调用此函数  ，判断分块存不存在
            beforeSend: function (block) {
                var deferred = WebUploader.Deferred();
                $.ajax({
                    type: "POST",
                    url: "/checkChunk",
                    data: {
                        md5File: md5File,  //文件唯一标记
                        chunk: block.chunk,  //当前分块下标
                    },
                    dataType: "json",
                    success: function (response) {
                        if (response) {
                            deferred.reject(); //分片存在，跳过
                        } else {
                            deferred.resolve();  //分块不存在或不完整，重新发送该分块内容
                        }
                    }
                }, function (jqXHR, textStatus, errorThrown) { //任何形式的验证失败，都触发重新上传
                    deferred.resolve();
                });
                return deferred.promise();
            },
            //时间点3：分片上传完成后，通知后台合成分片
            afterSendFile: function (file) {
                var chunksTotal = Math.ceil(file.size / (5 * 1024 * 1024));
                if (chunksTotal >= 1) {
                    //合并请求
                    var deferred = WebUploader.Deferred();
                    $.ajax({
                        type: "POST",
                        url: "/merge",
                        data: {
                            name: file.name,
                            md5File: md5File,
                            chunks: chunksTotal
                        },
                        cache: false,
                        async: false,  // 同步
                        dataType: "json",
                        success: function (response) {
                            if (response) {
                                //$('#' + file.id).find('p.state').text('上传成功');
                                //$('#' + file.id).find('.progress').fadeOut();
                            } else {
                                //$('#' + file.id).find('p.state').text('合并出错');
                                deferred.reject();
                            }
                        }
                    })
                    return deferred.promise();
                }
            }
        });

        // var uploader = WebUploader.create({
        //     auto: true,// 选完文件后，是否自动上传。
        //     swf: '/lib/webuploader/Uploader.swf',// swf文件路径
        //     server: '/upload',// 文件接收服务端。
        //     pick: '#browse',// 选择文件的按钮。可选。
        //     chunked: true,//开启分片上传
        //     chunkSize: 5 * 1024 * 1024,//5M
        //     chunkRetry: 3,//错误重试次数
        //     fileNumLimit: 1,
        // });
        //
        // //上传添加参数
        // uploader.on('uploadBeforeSend', function (obj, data, headers) {
        //     data.md5File = md5File;
        // });
        //
        // // 当有文件被添加进队列的时候
        // uploader.on('fileQueued', function (file) {
        //     //$("#picker").hide();//隐藏上传框
        //     $("#file-list").append('<div id="' + file.id + '" class="item">' +
        //         '<h4 class="info">' + file.name + '</h4>' +
        //         '<p class="state"></p>' +
        //         '</div>');
        // });
        //
        // // 文件上传过程中创建进度条实时显示。
        // uploader.on('uploadProgress', function (file, percentage) {
        //     var $li = $('#' + file.id),
        //         $percent = $li.find('.progress .progress-bar');
        //
        //     // 避免重复创建
        //     if (!$percent.length) {
        //         $percent = $('<div class="progress progress-striped active">' +
        //             '<div class="progress-bar" role="progressbar" style="width: 0%"></div>' +
        //             '</div>').appendTo($li).find('.progress-bar');
        //     }
        //     $li.find('p.state').text('上传中....');
        //     $percent.css('width', percentage * 100 + '%');
        // });
    });