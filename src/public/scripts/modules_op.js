const maxResults = 1;
const maxPage = 1;
/*
* 페이지 정보
* 비디오 댓글 관련 structure
  cmtInfo = {"imgUrl" : , "userId:" , "comment:" }
  cmtInfoArr = {"nextPageToken" :, "comment_count":, "commentList": [cmtInfo]}
  videoCmtInfo = {"videoId":, "comment_count":, "korPercent": }

* 재생목록 관련 structure
  videoItem = {"videoid":, title":, "img":, "korPercent":,}
  videoList = [videoItem]
  playListOne = {"groupId": , "item" : videoList}
  playListAll = {"channelId": , "playList" : playListOne}

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
function getVideoComment(_nextpage) {
    return new Promise(function(resolve, reject) {
        const videoId = $("#videoId").val();
        let url = "https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&key="+api_key+"&videoId="+videoId+"&maxResults="+maxResults;
        if (_nextpage != "") url += ("&pageToken=" + _nextpage);

        $.get(url, function(data) {
            if (data) resolve(data);
            else reject("Err : video info or url is wrong");
        })
    })
}
function getVideoCommentAll() {
    return new Promise(function(resolve, reject) {
        if (!$("#videoId").val()) { reject("alert : Link address is empty!!!");}
        // if(!nextpage) { reject("Err : getVideoCommentAll() has no next page");}
        //특정 비디오 들어오면
        let videoCmtInfo = new Object();//기능1 : 하나의 비디오에 대한 댓글 정보
        const videoCmtCnt = maxPage * maxResults;
        videoCmtInfo.videoId = $("#videoId").val();
        videoCmtInfo.comment_count = 0;
        videoCmtInfo.korPercent = 0;

        var page = 0;
        // for (; page<maxPage; page++) {
        //     let nextpage="";
            getVideoComment(nextpage)
            .then(function(comment) { return getBriefComment(comment);})
            .then(function(commentBrief) {
                videoCmtInfo.comment_count += commentBrief.comment_count;
                // console.log("> round " + page + " count :" + videoCmtInfo.korPercent);
                nextpage = videoCmtInfo.nextPageToken;
                // console.log(nextpage);
                return getKorPercent(commentBrief);
            })
            .then(function(_korpercent) {
                videoCmtInfo.korPercent += _korpercent;
                if (videoCmtInfo.korPercent != 0) {//어느정도 손실 감안.이전값과 2등분한 값을 취함
                    videoCmtInfo.korPercent /2;
                    videoCmtInfo.korPercent = _korpercent;
                }
                resolve(videoCmtInfo);
                // console.log(" > actual round :" + page);
            })
            .catch(function(err) { console.log(err);})
            // console.log("> done!!! yet");
            // if (videoCmtCnt == videoCmtInfo.comment_count) {   console.log("> done!!! all"); resolve(videoCmtInfo);}
        // }
    })
}
function batchComment(res) {
    if (res.count == 10);
    getVideoCommentAll().then(function(res) {batchComment(res););
}
function getBriefComment(data) {
    return new Promise(function(resolve, reject) {
        if (!data) {reject("Err : getImgTitleText() has no data");}
        let cmtInfoArr = new Object();
        let i = 0;
        cmtInfoArr.commentList = new Array();
        for(; i<data.items.length; ++i) {
            let cmtInfo = new Object();
            cmtInfo.imgUrl = data.items[i].snippet.topLevelComment.snippet.authorProfileImageUrl;
            cmtInfo.userid = data.items[i].snippet.topLevelComment.snippet.authorDisplayName;
            cmtInfo.comment = data.items[i].snippet.topLevelComment.snippet.textDisplay;
            cmtInfoArr.commentList.push(cmtInfo);
        }

        if (i == data.items.length) {
          cmtInfoArr.comment_count = data.items.length;
          cmtInfoArr.nextPageToken = data.nextPageToken;
          resolve(cmtInfoArr);
        }
    })
}
function getKorPercent(_cmtInfoArr) {
    return new Promise(function(resolve, reject) {
        if (_cmtInfoArr.commentList.length == 0) {
            reject("댓글을 먼저 불러와주세요");
        }
        let i = 0, total = _cmtInfoArr.commentList.length;
        let count = 0, res = 0;
        let commentlist = _cmtInfoArr.commentList;
        for (i=0; i<commentlist.length; ++i) {
              //1. 하이퍼 링크 제거
              let tar_str = commentlist[i].comment;
              let find_index = tar_str.lastIndexOf("</a>");
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
    return new Promise(function(resolve, reject) {
        let videoId = $("#videoId").val();
        const url = "https://www.googleapis.com/youtube/v3/playlists?part=snippet&key="+api_key+"&channelId="+videoId+"&maxResults="+maxResults;
        $.get(url, function(data) {//대표 재생목록 가져오기
            if (data) {resolve(data);}
            else reject("Err : No playlist found!");
        })
    })
}
function getBriefPlayList(data) {
    return new Promise(function(resolve, reject) {
        let videoList = new Array();//대표재생목록
        let result = "";
        let i = 0;
        for(i=0; i<data.items.length; ++i) {
            let videoItem = new Object();
            videoItem.videoId = data.items[i].id;
            // rJson.title = data.items[i].snippet.title;
            // rJson.img = data.items[i].snippet.thumbnails.medium.url;
            videoList.push(videoItem);
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
            resolve(videoList);
        } else {
            reject("Err : getBriefPlayList() is not working");
        }
    })
}
function getPlaylistItem(_videoList) {//한 비디오 항목에 대한 재생목록 리스트를 담아야함
    return new Promise(function(resolve, reject) {
          if (!_videoList) reject("Err : getPlaylistItem()-> no playlist item were found");
          let i = 0;
          console.log(_videoList);
          let playListAll = new Array();//대표 비디오-비디오 목록
          for (; i < _videoList.length; ++i) {
              const url = "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&key="+api_key+"&playlistId="+_videoList[i].videoId+"&maxResults="+maxResults;
              let playListOne = new Object();
              let videoList = new Array();
               $.get(url, function(data) {
                     for (var j=0; j<data.items.length; ++j) {
                         let videoItem = new Object();
                         videoItem.videoid = data.items[i].snippet.resourceId.videoId;
                         videoItem.title = data.items[i].snippet.title;
                         videoItem.img = "";
                         videoItem.korPercent = -1;
                         videoList.push(videoItem);
                     }
                     if (j == data.items.length) {
                          playListOne.groupId = _videoList[i].videoId;
                          playListOne.item = videoList;
                          playListAll.push(playListOne);
                     }
                     if (data && !playListAll.channelId) { playListAll.channelId = data[0].items[0].snippet.channelId;}
               })
           }
           if (i == _videoList.length) { resolve(playListAll);}
    })
}

$(document).ready(function() {
    let cmtInfoArr = new Object();//

    //기능1. 단일 비디오 내 댓글 가져오기
    $('#get_v_cmt').click(function(e) {
        e.preventDefault();
        $("#results").empty();
        var result = "";
        getVideoComment("").then(function(_raw_cmtInfo) { return getBriefComment(_raw_cmtInfo);})
        .then(function(_cmtInfoArr) {
              // videoCmtInfo.videoId = videoId;
              // videoCmtInfo.commentList = _cmtInfoArr.commentList;
              cmtInfoArr = _cmtInfoArr;
              for (var i=0; i < _cmtInfoArr.commentList.length; ++i) {
                    result = `
                    <div class="well">
                    <img class="img-rounded" src="${_cmtInfoArr.commentList[i].imgUrl}">
                    </div>

                    <h5>${_cmtInfoArr.commentList[i].userId}</h5>

                    <p>
                      ${_cmtInfoArr.commentList[i].comment}
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
        //  videoCmtInfo = {"videoId":, "comment_count":, "korPercent": }
        // getVideoCommentAll().then(function(res) {
        //     alert(res.korPercent);
        //     console.log(res);
        // }).catch(function(err) { console.log(err);})
        //
        batchComment();
    })
    //기능3. 채널 내 외국인이 가장 많이 사랑한 영상
    $('#get_best_glob').click(function(e) {
        e.preventDefault();
        $("#results").empty();
        getPlaylistData()
        .then(function(videoList_raw) { return getBriefPlayList(videoList_raw);})
        .then(function(videoList) { return getPlaylistItem(videoList);})//대표 비디오에 대하여 비디오 목록 불러오기
        .catch(function(err) { console.log(err);})
        .then(function(playListAll) { return getVideoComment(playListAll);})// 댓글 가져오고
        .catch(function(err) { console.log(err);});
        // .then(function(videocmts) { return getKorPercent(videocmts);})// 한글판별
        // .catch(function(err) { console.log(err);})
        // 비디오 이름 + 조회수 + 댓글 퍼센트 기록
        //댓글 퍼센트 중심으로 정렬
        //테이블 형태로 보여주기
    })
})
