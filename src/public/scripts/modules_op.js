const maxResults = 2;
const maxPage = 4;
/*
* user defined
*
* 페이지 정보
  pageInfo = {"videoId:", "nextPage:", "maxResults:"}

* 비디오 댓글 관련 structure
  cmtInfo = {"imgUrl" : , "userid:" , "comment:" }
  cmtInfoArr = {"nextPageToken" :, "comment_count":, "commentList": [cmtInfo]}

* 재생목록 관련 structure
  videoItem = {"videoId":, title":, "img":, "comment_count":, "korPercent":, "state:"}
  playListOne = {"groupId": , "item" : [ videoItem ] }
  playListAll = {"channelId": , "playList" : [ playListOne ]}

  playListItem = {"groupId :", "videoId:"}
  playListItemArr = [ playListItem ]

*/
/*
  * user-defined types
*/
var videoItem = function(videoId, title, img){//, comment_count, korPercent, state) {
    this.videoId = videoId;
    this.title = title;
    this.img = img;
    this.comment_count = 0;
    this.korPercent = 0;
    this.state = "ready";
}
var playListItem = function(groupid, videoId) {
    this.groupId = groupid;
    this.videoId = videoId;
    return this;
}
var pageInfo = function(videoId, nextpage, maxresults) {
    this.videoId = videoId;
    this.nextPage = nextpage;
    this.maxResults = maxresults;
    return this;
}
var cmtInfo = function(imgurl, userid, comment) {
    this.imgUrl = imgurl;
    this.userId = userid;
    this.comment = comment;
    return this;
}
var cmtInfoArr = function() {
    this.nextPageToken = "";
    this.comment_count = 0;
    this.commentList = [];
    return this;
}
var playListOne = function(groupId, items) {
    this.groupId = groupId;
    this.item = new Array();
    for (var ele in items) { this.item.push(ele);}
}
var playListAll = function(channelId, playlist) {
    this.channelId = channelId;
    this.playList = new Array();
    for (var ele in playlist) { this.playList.push(ele);}
}
/*
  * part 1 : Data loader
*/
//단일 페이지에 대하여 maxResults 사이즈만큼 댓글 로드
//return : raw data
function loadVideoComment(_pageInfo)
{
    return new Promise(function(resolve, reject) {
        let url = "https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&key="+api_key+"&videoId="+_pageInfo.videoId+"&maxResults="+_pageInfo.maxResults;
        if (_pageInfo.nextPage != "") url += ("&pageToken=" + _pageInfo.nextPage);

        $.get(url, function(data) {
            if (data) resolve(data);
            else reject("Err : video info or url is wrong");
        })
        .fail(function(e) {
            reject("Err : loadVideoComment() failed");
        })
    })
}
//특정 재생목록에 속한 비디오 그룹 정보 가져오기
function loadPlayListItem(_groupid)
{
    return new Promise(function(resolve, reject) {
        const url = "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&key="+api_key+"&playlistId="+_groupid+"&maxResults="+maxResults;
        let pliArr = [];
        $.get(url, function(data) {
            if (!data) { reject ("Err : loadPlayListItem() has no such playlist Item about that groupid");}
            let i = 0;
            for (; i < data.items.length; ++i) {
                let _item = new playListItem(_groupid, data.items[i].snippet.resourceId.videoId);
                pliArr.push(_item);
            }
            if (i == data.items.length) { resolve(pliArr);}
        }).fail(function(err) {
            console.log(err);
        })
    })
}
//특정 채널이 가진 대표 재생목록에 대한 raw 정보 불러오기
function loadPlaylistData()
{
  return new Promise(function(resolve, reject) {
      let _channelId = $("#videoId").val();
      const url = "https://www.googleapis.com/youtube/v3/playlists?part=snippet&key="+api_key+"&channelId="+_channelId+"&maxResults="+maxResults;
      $.get(url, function(data) {//대표 재생목록 가져오기
        if (data) { resolve(data); }
        else reject("Err : No playlist found!");
      })
  })
}
let __pageInfo = new pageInfo("", maxResults);

/*
  * part 2 : Preprocesser
*/
//댓글에 대한 raw한 데이터들에 대하여 관심 데이터만 반환
//return : cmtInfo
function getBriefComment(data)
{
    return new Promise(function(resolve, reject) {
        if (!data) {reject("Err : getImgTitleText() has no data");}
        let cmtArr = new cmtInfoArr();
        let i = 0;
        for(; i<data.items.length; ++i) {
            let cmt = new cmtInfo(data.items[i].snippet.topLevelComment.snippet.authorProfileImageUrl,
                                      data.items[i].snippet.topLevelComment.snippet.authorDisplayName,
                                      data.items[i].snippet.topLevelComment.snippet.textDisplay);
            cmtArr.commentList.push(cmt);
        }
        if (i == data.items.length) {
            cmtArr.nextPageToken = data.nextPageToken;
            cmtArr.comment_count = data.items.length;
            resolve(cmtArr);
        }
    })
}
//댓글 리스트에 대하여 한글 비율 계산
//return : 숫자형
function calKorPercent(_cmtInfoArr)
{
  return new Promise(function(resolve, reject) {
      if (_cmtInfoArr.commentList.length == 0) { reject("댓글을 먼저 불러와주세요");}

      let i = 0, total = _cmtInfoArr.commentList.length;
      let count = 0, res = 0;
      let commentlist = _cmtInfoArr.commentList;

      for (i = 0; i < commentlist.length; ++i) {
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
          res = (count/total * 100);
          resolve(res);
      } else { reject("Err : getKorPercent() cannot process it all");}
  })
}
//페이지에 대하여 한국인 비율 계산하기
function getKorPercent(_videoItem)
{
    return new Promise(function(resolve, reject) {
      if (!$("#videoId").val()) { reject("Err : getKorPercent() has no link address.");}
      __pageInfo.videoId = _videoItem.videoId;

      loadVideoComment(__pageInfo)
      .then(function(comment) {
        console.log("step1");
        return getBriefComment(comment);
      })
      .then(function(brief_cmtInfoArr) {
          //요청한 수보다 적을 경우 == 자료수가 부족하다면
          console.log("step2");
          console.log(brief_cmtInfoArr);
          if (brief_cmtInfoArr.comment_count != maxResults) { _videoItem.state = "less";}
          else {_videoItem.state = "more";}
          __pageInfo.nextPage = brief_cmtInfoArr.nextPageToken;
          _videoItem.comment_count += brief_cmtInfoArr.comment_count;
          return calKorPercent(brief_cmtInfoArr);
      })
      .then(function(_korpercent) {
          console.log("step3");
          if (_videoItem.korPercent != 0) {//어느정도 손실 감안.이전값과 2등분한 값을 취함
            _videoItem.korPercent += _korpercent;
            _videoItem.korPercent /= 2;
          } else {
            _videoItem.korPercent = _korpercent;
          }
          console.log(_videoItem.korPercent);
          resolve(_videoItem);
      })
      .catch(function(err) { console.log(err);})
    })
}
//특정 채널이 가진 대표 재생목록에 대한 간략한 정보 불러오기
//return : videoList
function getBriefPlayList(data)
{
    return new Promise(function(resolve, reject) {
        let videoList = [];//대표재생목록
        let result = "";
        let i = 0;
        for(i=0; i<data.items.length; ++i) {
            let v = new videoItem(data.items[i].id, "", "");//id, title, img
            // videoItem.videoId = data.items[i].id;
            videoList.push(v);
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

//재생목록별 videoItem 분류작업
//return : playListAll : 배열 요소 타입 playListOne
let __playListAll = new playListAll("", new Array());
function classifyGroupKp(not_used_yet)
{
      if (__playlistItemArr.length != __groupKorpercent.length) { return new Error("데이터 로드가 정상적으로 되지 않았습니다.");}
      return new Promise(function(resolve, reject) {
          //__playlistItemArr : 배열 요소 타입 : playItem
          //__groupKorpercent : 배열 요소 타입 : videoItem
          let i = 0;
          //같은 그룹은 같은 tiem으로 분류
          for (; i < __playlistItemArr.length; ++i) {
              let j = 0;
              //기존 그룹에 추간
              for (; j <__playlistItemArr.playList.length; ++j) {
                  //현재 videoItem의 groupId가 이미 존재하는 지 확인
                  if (__playlistItemArr.playList[j].groupId == __playlistItemArr[i].groupId) { __playlistItemArr.playList[j].item.push(__playlistItemArr[i]); break;}
              }
              //새로 추가
              if (j == __playlistItemArr.playList.length) {
                  let plo = new playListOne(__playlistItemArr[i].groupId, new Array(__groupKorpercent[i]));
              }
          }
          if (i == __playlistItemArr.length) {resolve(__playListAll);}
      });
}
//그룹화된 videoItem 정보를 이용하여 KP 구하기
function calGroupKp(_playlistall) {
    new Promise(function(resolve, reject) {
        if (!_playlistall) { reject("Err : calGroupKp() has an empty data");}
        // videoItem = {"videoId":, title":, "img":, "comment_count":, "korPercent":, "state:"}
        // playListOne = {"groupId": , "item" : [ videoItem ] }
        // playListAll = {"channelId": , "playList" : [ playListOne ]}
        //
        // playListOne 에 group_korpercent 키 추가하여 진행
        var i = 0;
        for (; i < _playlistall.playlist.length; ++i) {
            let groupKPsum = 0;
            var j = 0;
            for (var j = 0; j < _playlistall[i].item.length; ++j) {
                groupKPsum += _playlistall[i].item[j].korPercent;
            }
            if (j == _playlistall[i].item.length) _playlistall[i].group_kp = groupKPsum/_playlistall[i].item.length;
        }
        if ( i == _playlistall.playlist.length) { resolve(_playlistall);}
    });
}
/*
   * part 3 : Batch
*/
let __group_cnt = 0;
let __playlistItemArr = [];
//채널 재생목록에 대한 비디오 리스트 구하기
function batchPlayListItem(_grouplist)
{
    if (__group_cnt >= _grouplist.length) {
        __group_cnt = 0;
        return alert("해당 채널로부터 " + _grouplist.length + "개 재생목록 정보를 모두 불러왔습니다");
    }
    loadPlayListItem(_grouplist[__group_cnt].videoId)
    .then(function(res) {
        for (var i = 0; i < res.length; ++i) { __playlistItemArr.push(res[i]);}//1차원 배열화// __playlistItemArr.push(res);//2차원 배열화
        __group_cnt++;
        batchPlayListItem(_grouplist);
    }).catch(function(err) { console.log(err);})
}
let _pageCount = 0;
//복수 페이지에 대한 한국인 비율 계산
function batchGetKorPercent(_videoItem)
{
  //  videoItem = {"videoId":, "comment_count":, "korPercent":, "state:"}
  if (_videoItem.state == "less"
  || _pageCount++ >= maxPage
  || _videoItem.comment_count >= maxPage * maxResults) {
    _pageCount=0;
    _videoItem.state = "done";
    console.log(">> all Done");
    // console.log(_videoItem);
    var msg = ">> 총 댓글 개수 : " + _videoItem.comment_count + "\n >> 한국인 비율 : " + _videoItem.korPercent.toFixed(3);
    alert(msg);
    return _videoItem;
  }
  getKorPercent(_videoItem)
  .then(function(res) { batchGetKorPercent(res);})
  .catch(function(err) { console.log(err);})
}
let __groupVideolist_idx = 0;
let __groupKorpercent = [];
//비디오 그룹별 한국인 지수 구하기
function batchVideoKorpercent(_groupVideolist)
{
    //test
    if (!_groupVideolist) { throw new Error("batchGroupKorpercent() no data");}
    if (__groupVideolist_idx >= _groupVideolist.length) {
        __groupVideolist_idx = 0;
        return __groupKorpercent;
    }
    getKorPercent(new videoItem(_groupVideolist[__groupVideolist_idx++].videoId, "", ""))
    .then(function(res) { __groupKorpercent.push(res);batchVideoKorpercent(_groupVideolist);})
    .catch(function(err) { console.log(err);})
}
/*
  * part 4 : Driver
*/
//Drive : 채널 재생목록에 대한 비디오 리스트 구하기
function getChannelData()
{
  return new Promise(function(resolve, reject) {
      var _ch = 0;
      if (__playlistItemArr.length > 0) { alert("이미 받아왔습니다"); resolve(__playlistItemArr);}
      loadPlaylistData()
      .then(function(res) { return getBriefPlayList(res)})
      .then(function(res) { _ch = res.length; return batchPlayListItem(res);})
      .catch(function(err) { console.log(err);});
      if (_ch == __group_cnt) { console.log("1. getChannelData done"); resolve(__playlistItemArr);}
  })
}
//Drive : 각 비디오 그룹에 대하여 한국인 지수 구하기
function getVideoKorpercent(_glist)
{
    return new Promise(function(resolve, reject) {
        if (!_glist) { reject ("Err : getVideoKorpercent() has an empty data");}
        batchVideoKorpercent(_glist);
        if (_glist.length == __groupKorpercent.length) { resolve(__groupKorpercent);}
    })
}
//Drive : 그룹별 KP 지수 구하기
function getGroupKorpercent() {
    return new Promise(function(resolve, reject) {
          getVideoKorpercent(__playlistItemArr)
          .then(function(res) { return classifyGroupKp(res);}).catch(function(err) { console.log(err);})
          .then(function(res) { return calGroupKp(__playlistItemArr);}).catch(function(err) { console.log(err);})
          .then(function() { console.log("all passed"); resolve();})
    })
}
function init()
{
    let _flush__pageInfo = new pageInfo("", "", maxResults);
    let _flush__groupKorpercent = [];
    let _flush__playlistItemArr = [];
getGroupKorpercent
    __groupVideolist_idx = 0;
    __group_cnt = 0;
    _pageCount = 0;
    __groupKorpercent = _flush__groupKorpercent;
    __pageInfo = _flush__pageInfo;
    __playlistItemArr = _flush__playlistItemArr;
}
$(document).ready(function() {
    init();

    //기능1. 단일 비디오 내 댓글 가져오기
    $('#get_v_cmt').click(function(e) {
        e.preventDefault();
        $("#results").empty();
        var result = "";
        let cmtArr = new cmtInfoArr();//
        let pinfo = new pageInfo($("#videoId").val(),"", maxResults);

        loadVideoComment(pinfo).then(function(_raw_cmtInfo) { return getBriefComment(_raw_cmtInfo);})
        .then(function(_cmtInfoArr) {
              cmtArr = _cmtInfoArr;
              for (var i=0; i < _cmtInfoArr.commentList.length; ++i) {
                    result = `
                    <div class="well">
                    <img class="img-rounded" src="${_cmtInfoArr.commentList[i].imgUrl}">
                    </div>

                    <h5>${_cmtInfoArr.commentList[i].userid}</h5>

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
        e.preventDefault();
        $("#results").empty();

        batchGetKorPercent(new videoItem($("#videoId").val(), "", ""));
    })
    //기능3. 채널 내 외국인이 가장 많이 사랑한 영상
    let click_count = 0;
    $('#get_best_glob').click(function(e) {
        e.preventDefault();
        $("#results").empty();

        //채널로부터 데이터를 받아옴
        if (click_count++ == 0) {
        getChannelData()
        .then(function(res) {
            console.log("pass1");
            $("#get_best_glob").html("채널 KP지수 계산 시작");
        });
        } else {
              click_count++;
              click_count /= 2;
              console.log();
              getGroupKorpercent()
              .then(function(res) {
                  console.log("> done all");
                  console.log(res);
              })
              .then(function() { init();}).catch(function(err) { console.log(err);})
        }
    })
})
