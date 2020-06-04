const maxResults = 3;
const maxComment = 2;
const maxPage = 2;

/*
  * part 1 : Data loader
*/
//단일 페이지에 대하여 maxResults 사이즈만큼 댓글 로드
//return : raw data
function loadVideoComment(_pageInfo)
{
    return new Promise(function(resolve, reject) {
        // console.log(_pageInfo);
        let url = "https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&key="+api_key+"&videoId="+_pageInfo.videoId+"&maxResults="+_pageInfo.maxResults;
        if (_pageInfo.nextPage && _pageInfo.nextPage != "") url += ("&pageToken=" + _pageInfo.nextPage);

        $.get(url, function(data) {
            if (data) resolve(data);
            else reject("Err : video info or url is wrong");
        })
        .fail(function(e) {
            reject(e);
        });
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
            for (; i <= data.items.length; ++i) {
                if (i == data.items.length) { resolve(pliArr); break;}//Todo
                let _item = new playListItem(_groupid, data.items[i].snippet.resourceId.videoId);
                pliArr.push(_item);
            }
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
let __pageInfo = new pageInfo("", "", maxComment);

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
        for(; i<= data.items.length; ++i) {
            if (i == data.items.length) {//todo : 동기화 시도
                // console.log("brief done");
                cmtArr.nextPageToken = data.nextPageToken;
                cmtArr.comment_count = data.items.length;
                resolve(cmtArr);
            }
            let cmt = new cmtInfo(data.items[i].snippet.topLevelComment.snippet.authorProfileImageUrl,
                                      data.items[i].snippet.topLevelComment.snippet.authorDisplayName,
                                      data.items[i].snippet.topLevelComment.snippet.textDisplay
                                  );
            cmtArr.commentList.push(cmt);
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

      for (i = 0; i <= commentlist.length; ++i) {
          //todo : 동기화 시도
          if (i == commentlist.length) {
              res = (count/total * 100);
              resolve(res);
          }
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
      }
      if (i > commentlist.length){ reject("Err : getKorPercent() has an synchronus problem");}
  })
}
//페이지에 대하여 한국인 비율 계산하기
function getKorPercent(_videoItem)
{
    return new Promise(function(resolve, reject) {
      if (!$("#videoId").val()) { reject("Err : getKorPercent() has no link address.");}
      __pageInfo.videoId = _videoItem.videoId;

      loadVideoComment(__pageInfo)
      .then(function(comment) { return getBriefComment(comment);}).catch(function(err) { reject(err);})
      .then(function(brief_cmtInfoArr) {
          //최대 가능 요청수보다 실제 자료수가 적다면
          if (brief_cmtInfoArr.comment_count != maxComment) { _videoItem.state = "less";}//미달 자료 상태표시
          else {_videoItem.state = "more";}//충분 자료 상태표시
          __pageInfo.nextPage = brief_cmtInfoArr.nextPageToken;//페이지 정보 업데이트
          _videoItem.comment_count += brief_cmtInfoArr.comment_count;//비디오 정보 업데이트
          return calKorPercent(brief_cmtInfoArr);//한 비디오내 KP 계산
      })
      .then(function(_korpercent) {
          if (_videoItem.korPercent != 0) {//처음 들어온 값이 아니라면
            _videoItem.korPercent += _korpercent;
            _videoItem.korPercent /= 2;//이전 값과 평균 취함
          } else {
            _videoItem.korPercent = _korpercent;//처음 들어온 값으로 초기화
          }
          console.log(_videoItem.korPercent);//최종 계산값 제시
          //todo : 동기화 시도
          resolve(_videoItem);
      }).catch(function(err) { reject(err);})
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
        for(i=0; i<= data.items.length; ++i) {
            //todo : 동기화 시도
            if (i == data.items.length) { resolve(videoList);}
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
        //todo : 동기화 시도
        if (i > data.items.length) { reject("Err : getBriefPlayList() has an synchronus problem");}
    })
}

//재생목록별 videoItem 분류작업
//return : playListAll : 배열 요소 타입 playListOne
let __playListAll = new playListAll("", new Array());
function classifyGroupKp(not_used_yet)
{
      if (__playlistItemArr.length != __groupKorpercent.length) { return new Error("데이터 로드가 정상적으로 되지 않았습니다.");}
      return new Promise(function(resolve, reject) {
          //__playlistItemArr : 배열 요소 타입 : playListItem
          //__groupKorpercent : 배열 요소 타입 : videoItem
          console.log("> classifyGroupKp() start");
          let i = 0;

          $.ajax({
              url:'http://localhost:3000/classifyVideo',
              type : 'POST',
              traditional : true, //배열을 넘기도록 한다.
              data : {
                  'groupInfo' : __playlistItemArr,
                  'videoKP' : __groupKorpercent
              },
              success:function(data){
                  console.log("OK");
              },
              error:function(request, status, error) {
                  alert(error);
              }
          })
          //__playlistItemArr : 타입 [groupId, videoId]
          //__groupKorpercent : 타입 [videoItem]
          //같은 그룹은 같은 item으로 분류
          // for (; i <= __playlistItemArr.length; ++i) {
          //     //todo : 동기화 시도
          //     if (i == __playlistItemArr.length) {
          //         console.log(">> 그룹화 종료");
          //         resolve(__playListAll);
          //     }
          //     let j = 0;
          //     //기존 그룹 탐색
          //     for (; j <= __playListAll.playList.length; ++j) {
          //         //현재 videoItem의 groupId가 이미 존재하는 지 확인
          //         if (__playListAll.playList[j].groupId == __playlistItemArr[i].groupId) {
          //             __playListAll.playList[j].item.push(__groupKorpercent[i]);
          //             break;
          //         }
          //     }
          //     //새로 추가
          //     if (j == __playListAll.playList.length) {
          //       let plo = new playListOne(__playlistItemArr[i].groupId, new Array(__groupKorpercent[i]));
          //       __playListAll.playList[j].item.push(plo);
          //     }
          // }
          // //todo : 동기화 노력
          // if (i > __playlistItemArr.length) {
          //     reject("Err : classifyGroupKp() has a synchronus problem now");
          // }
      });
}
function calGroupKp(_playlistall) {
    new Promise(function(resolve, reject) {
        if (!_playlistall) { reject("Err : calGroupKp() has an empty data");}
        // videoItem = {"videoId":, title":, "img":, "comment_count":, "korPercent":, "state:"}
        // playListOne = {"groupId": , "item" : [ videoItem ] }
        // playListAll = {"channelId": , "playList" : [ playListOne ]}
        //
        // playListOne 에 group_korpercent 키 추가하여 진행
        console.log("calGroupKp() start");
        let i = 0
        new Promise(function(resolve, reject) {

        })
        for (; i <= _playlistall.playlist.length; ++i) {
            //todo : 동기화 시도
            if (i == _playlistall.playlist.length) {
              console.log(">> 그룹화 계산 종료");
              resolve(_playlistall);
            }
            let groupKPsum = 0;
            let j = 0;

            for (; j <= _playlistall.playList[i].item.length; ++j) {
              //todo : 동기화 시도
                if (j == _playlistall[i].item.length) {
                  _playlistall.playList[i].groupKP = groupKPsum/_playlistall.playList[i].item.length;
                  break;
                }
                groupKPsum += _playlistall.playList[i].item[j].korPercent;
            }
            // recursiveCalGroupKP(_playlistall.playList[i]);
        }
        //todo : 동기화 시도
        if (i > _playlistall.playlist.length) {
            reject("Err : calGroupKp() has a synchronus problems");
        }

    });
}
/*
   * part 3 : Batch
*/
let __pageCount = 0;
//op2.복수 페이지에 대한 한국인 비율 계산
function batchGetKorPercent(_videoItem)
{
  if (_videoItem.state == "less"
  || __pageCount++ >= maxPage
  || _videoItem.comment_count >= maxPage * maxResults) {
    __pageCount=0;
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
let __group_cnt = 0;
let __playlistItemArr = [];
//3-1 채널 재생목록에 소속된 비디오 리스트 구하기
function batchPlayListItem(_grouplist)
{
    if (__group_cnt >= _grouplist.length) {
        __group_cnt = 0;
        alert("해당 채널로부터 " + _grouplist.length + "개 재생목록 정보를 모두 불러왔습니다");
        return __playlistItemArr;
    }
    loadPlayListItem(_grouplist[__group_cnt].videoId)
    .then(function(res) {
        for (var i = 0; i < res.length; ++i) { __playlistItemArr.push(res[i]);}//1차원 배열화// __playlistItemArr.push(res);//2차원 배열화
        __group_cnt++;
    })
    .then(function() { batchPlayListItem(_grouplist);})
    .catch(function(err) { console.log(err);})
}
let __groupVideolist_idx = 0;
let __groupKorpercent = [];
//op3-2 비디오 리스트에 대한 KP지수 구하기
function batchVideoKorpercent(_groupVideolist)
{
    //test
    if (!_groupVideolist) { throw new Error("batchGroupKorpercent() no data");}
    if (__groupVideolist_idx >= _groupVideolist.length) {
        __groupVideolist_idx = 0;
        console.log("> passing");
        console.log(__groupKorpercent);
        classifyGroupKp();
        return 1;
    } else {
        getKorPercent(new videoItem(_groupVideolist[__groupVideolist_idx++].videoId, "", ""))
        .then(function(res) {
            __groupKorpercent.push(res);
            batchVideoKorpercent(_groupVideolist);
        }).catch(function(err) { console.log(err);})
    }
}
/*
  * part 4 : Driver
*/
//Drive : 채널 재생목록에 대한 비디오 리스트 구하기
function getChannelData()
{
  return new Promise(function(resolve, reject) {
      if (__playlistItemArr.length > 0) { alert("이미 받아왔습니다"); resolve(__playlistItemArr);}
      loadPlaylistData()
      .then(function(res) { return getBriefPlayList(res)})
      .then(function(res) { resolve(batchPlayListItem(res)) })
      .catch(function(err) { console.log(err);});
      // if (_ch ``== __group_cnt) { __group_cnt = 0; console.log("1. getChannelData done"); resolve(__playlistItemArr);}
  })
}
function init()
{
    let _flush__pageInfo = new pageInfo("", "", maxComment);
    let _flush__groupKorpercent = [];
    let _flush__playlistItemArr = [];

    __groupVideolist_idx = 0;
    __group_cnt = 0;
    __pageCount = 0;
    __groupKorpercent = _flush__groupKorpercent;
    __playlistItemArr = _flush__playlistItemArr;
    __pageInfo = _flush__pageInfo;
}

$(document).ready(function() {
    init();

    //기능1. 단일 비디오 내 댓글 가져오기
    $('#get_v_cmt').click(function(e) {
        e.preventDefault();
        $("#results").empty();
        var result = "";
        let cmtArr = new cmtInfoArr();//
        let pinfo = new pageInfo($("#videoId").val(),"", maxComment);

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
    var click_count = 0;
    $('#get_best_glob').click(function(e) {
        e.preventDefault();
        $("#results").empty();

        //채널로부터 데이터를 받아옴
        if (click_count == 0) {
              getChannelData()
              .then(function(res) {
                  console.log("pass1");
                  $("#get_best_glob").html("채널 KP지수 계산 시작");
              });
        } else if (click_count == 1) {
            batchVideoKorpercent(__playlistItemArr);
        } else {
            click_count = 0;
        }

        click_count++;
    })
})
