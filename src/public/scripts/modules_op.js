const api_key = "AIzaSyDvk8_0Ncc7vLvoWT4gfTxeFs5DLIorSZ0";
const maxResults = 1;
/*
* 비디오 댓글 관련 structure
  cmtInfo = {"imgUrl" : , "userId:" , "comment:" }
  cmtInfo1Arr = [cmtInfo]
  videoCmtInfo = {"videoId":, "commentList:" cmtInfo1Arr }

* 재생목록 관련 structure
  playItem = {"videoid":, title":, "korPercent":,}
  playItem1Arr = [playItem]
  playList = {"groupId": , "item" : playItem1Arr}
  playList2Arr = [playList]

*/
function displayItem(target) {
    return new Promise(function(resolve, reject) {
        var result = "";
        $("#results").empty();
        for (var i = 0; i < target.length; ++i) {
            result = `
                <div class="well">
                    <img class="img-rounded" src="${target[i].imgUrl}">
                </div>

                  <h5>${target[i].title}</h5>


                <p>
                    ${target[i].context}
                </p>
            `;
            $("#results").append(result);
        }
        if (result != "") resolve();
        else reject("Err : display source is empty");
    })
}
function getVideoComment(vids) {
    return new Promise(function(resolve, reject) {
        var url = "https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&key="+api_key+"&videoId="+vids+"&maxResults="+maxResults;
        $.get(url, function(data) {
            if (data) resolve(data);
            else reject("Err : video info or url is wrong");
        })
    })
}
function getBriefComment(data) {
    return new Promise(function(resolve, reject) {
        var cmtInfo1Arr = new Array();
        for(var i=0; i<data.items.length; ++i) {
            var cmtInfo = new Object();
            cmtInfo.imgUrl = data.items[i].snippet.topLevelComment.snippet.authorProfileImageUrl;
            cmtInfo.userid = data.items[i].snippet.topLevelComment.snippet.authorDisplayName;
            cmtInfo.comment = data.items[i].snippet.topLevelComment.snippet.textDisplay;
            cmtInfo1Arr.push(cmtInfo);
        }
        if (cmtInfo1Arr) { resolve(cmtInfo1Arr);}
        if (!data) {reject("Err : getImgTitleText() has no data");}
    })
}
function getKorPercent(_videoCmt1Arr) {
    return new Promise(function(resolve, reject) {
        if (_videoCmt1Arr.commentList.length == 0) {
            reject("댓글을 먼저 불러와주세요");
        }
        var i = 0, total = _videoCmt1Arr.commentList.length;
        var count = 0, res = 0;
        var commentlist = _videoCmt1Arr.commentList;
        for (i=0; i<commentlist.length; ++i) {
              //1. 하이퍼 링크 제거
              var tar_str = commentlist[i].comment;
              var find_index = tar_str.lastIndexOf("</a>");
              if (find_index != -1) {//하이퍼링크가 있다면
                  tar_str = tar_str.substr(find_index+5, tar_str.length-find_index+4);
              }
              //2. 한글 여부 판단
              if (is_hangul_char(tar_str)) { count++;}
              else {//한글 아닐 때,
                  //3. 특수문자 확인
                  //특수 문자는 판정하지 않음 -> 추후에 아이디로 시도를 해볼 수 있음
                  if (is_emoticon_char(tar_str)) { total--;}
                  else {//특수문자도 아니라면 그냥 외국인임
                    /* 어느 해외인지 시도해볼 수 있음 */
                  }
              }
              // test(tar_str);
        }
        if (i == commentlist.length) {
            res = (count/total * 100).toFixed(3);
            resolve(String(res));
        } else { reject("Err : getKorPercent() cannot process it all");}
    })
}
function getPlaylistData() {
    var videoId = $("#videoId").val();
    var url = "https://www.googleapis.com/youtube/v3/playlists?part=snippet&key="+api_key+"&channelId="+videoId+"&maxResults="+maxResults;
    return new Promise(function(resolve, reject) {
        $.get(url, function(data) {//대표 재생목록 가져오기
            if (data) {resolve(data);}
            else reject("Err : No playlist found!");
        })
    })
}
function getBriefPlayList(data) {
    return new Promise(function(resolve, reject) {
        var briefPL = new Array();//대표재생목록
        var result = "";
        var i = 0;
        for(i=0; i<data.items.length; ++i) {
            var rJson = new Object();
            rJson.id = data.items[i].id;
            // rJson.title = data.items[i].snippet.title;
            // rJson.img = data.items[i].snippet.thumbnails.medium.url;
            briefPL.push(rJson);
            result = `
                <div class="well">
                    <img class="img-rounded" src="${data.items[i].snippet.thumbnails.medium.url}">
                </div>

                  <h5>${data.items[i].snippet.title}</h5>
                <p>
                    ${data.items[i].id}
                </p>
            `;
            $("#results").append(result);
        }
        if (i == data.items.length) {
            resolve(briefPL);
        } else {
            reject("Err : getBriefPlayList() is not working");
        }
    })
}
function getPlaylistItemData(playlist_gid) {
    return new Promise(function(resovle, reject) {
        var playlistItem = new Array();//소속 재생목록

        for (var i=0; i<playlist_gid.length; ++i) {
           var url = "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&key="+api_key+"&playlistId="+playlist_gid[i].id+"&maxResults="+maxResults;
           $.get(url, function(data){
               for (var j=0; j<data.items.length; ++j) {
                   var vJson = new Object();
                   vJson.groupId = playlist[i].id;
                   vJson.videoid = data.items[i].resourceId.videoId;
                   vJson.title = data.items[i].snippet.title;
                   playlistItem.push(vJson);
               }
           })
        }
        if (!playlistItem) resolve(playlistItem);
        else reject("Err : no playlist item were found");
    })
}

$(document).ready(function() {
    let cmtInfo1Arr = new Object();
    let videoCmtInfo = new Object();

    //기능1. 단일 비디오 내 댓글 가져오기
    $('#get_v_cmt').click(function(e) {
        e.preventDefault();
        $("#results").empty();
        var result = "";
        var videoId = $("#videoId").val();
        getVideoComment(videoId).then(function(raw_cmtInfo) { return getBriefComment(raw_cmtInfo);})
        .then(function(cmtInfoArr) {
              videoCmtInfo.videoId = videoId;
              videoCmtInfo.commentList = cmtInfoArr;

              for (var i=0; i < cmtInfoArr.length; ++i) {
                    result = `
                    <div class="well">
                    <img class="img-rounded" src="${cmtInfoArr[i].imgUrl}">
                    </div>

                    <h5>${cmtInfoArr[i].userId}</h5>

                    <p>
                      ${cmtInfoArr[i].comment}
                    </p>
                    `;
                    // <a href="${data.item[i].snippet.topLevelComment.snippet.authorChannelUrl}" target="_blank">
                    // </a>
                    $("#results").append(result);
              }
        }).catch(function(err) {
              console.log(err);
        });

       //서버에서 처리하지않음
       // $.ajax({
       //     url:'http://localhost:3000/getComment',
       //     type : 'POST',
       //     traditional : true, //배열을 넘기도록 한다.
       //     data : {
       //         'cmtArr' : cmtArr,
       //     },
       //     success:function(data){
       //         console.log("OK");
       //     },
       //     error:function(request, status, error) {
       //         alert(error);
       //     }
       // })
    })
    //기능2. 단일 비디오 내 한국인 댓글 판단
    $('#get_kor_pc').click(function(e) {
        getKorPercent(videoCmtInfo).then(function(korpercent) { alert("> korean percent : " + korpercent + "%");})
        .catch(function(err) { alert(err); })
    })
    //기능3. 채널 내 외국인이 가장 많이 사랑한 영상
    $('#get_best_glob').click(function(e) {
        e.preventDefault();
        $("#results").empty();
        getPlaylistData()
        .then(function(playlist) {return getBriefPlayList(playlist);})//playlist 받기
        .then(function(playlist_groupid) {
            // new Promise(function(resolve, reject) {
            //     for (var i = 0; i < playlist_groupid.length; ++i) {//각 playlist에 대하여
            //       videoCmt2Arr =
            //     }
            //
            // })
            return getPlaylistItemData(playlist_groupid);
        })
        .then(function(playlistItem) {return getVideoComment(playlistItem);})// 댓글 가져오고
        .then(function(videocmts) { return getKorPercent(videocmts);})// 한글판별
        .catch(function(err) { console.log(err);})
        // 비디오 이름 + 조회수 + 댓글 퍼센트 기록
        //댓글 퍼센트 중심으로 정렬
        //테이블 형태로 보여주기
    })
})
