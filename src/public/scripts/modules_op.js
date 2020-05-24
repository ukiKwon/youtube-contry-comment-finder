//GoogleAPI::댓글가져오기
function commentTread() {
  var url = "https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&key="+api_key+"&videoId="+videoId+"&maxResults=100";
  var result = "";
 $.get(url, function(data) {
      // console.log(data);
      for(var i=0; i<data.items.length; ++i) {
          result = `

              <div class="well">
                  <img class="img-rounded" src="${data.items[i].snippet.topLevelComment.snippet.authorProfileImageUrl}">
              </div>

                <h5>${data.items[i].snippet.topLevelComment.snippet.authorDisplayName}</h5>


              <p>
                  ${data.items[i].snippet.topLevelComment.snippet.textDisplay}
              </p>
          `;
          // <a href="${data.item[i].snippet.topLevelComment.snippet.authorChannelUrl}" target="_blank">
          // </a>
          $("#results").append(result);
          cmtArr.push(data.items[i].snippet.topLevelComment.snippet.textDisplay);
      }
   })
}
function getChannelData(url, callback) {
    var representative = new Array();
    return new Promise(function(resolve, reject) {
        $.get(url, function(data) {
             for(var i=0; i<data.items.length; ++i) {
                 var rJson = new Object();
                 rJson.id = data.items[i].id;
                 rJson.title = data.items[i].snippet.title;
                 rJson.img = data.items[i].snippet.thumbnails.medium.url;
                 representative.push(rJson);
                 result = `

                     <div class="well">
                         <img class="img-rounded" src="${rJson.img}">
                     </div>

                       <h5>${rJson.title}</h5>
                     <p>
                         ${rJson.id}
                     </p>
                 `;
                 $("#results").append(result);
             }
        })
        if (!representative) {resolve(representative);}
        else reject(representative);
    })
}
function getCalculate(data, callback) {
    var count = 0;
    for (var i=0; i < 1000000;++i) {++count;}
    callback(count);
}
$(document).ready(function() {
    // $("form").submit(function(event) {
    var cmtArr = new Array();
    var api_key = "AIzaSyDvk8_0Ncc7vLvoWT4gfTxeFs5DLIorSZ0";
    var maxResults = 1;
    //기능1. 단일 비디오 내 댓글 가져오기
    $('#get_v_cmt').click(function(e) {
        e.preventDefault();
        var videoId = $("#videoId").val();
        $("#results").empty();
        var url = "https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&key="+api_key+"&videoId="+videoId+"&maxResults="+maxResults;
        var result = "";
       $.get(url, function(data) {
          console.log(data);
          for(var i=0; i<data.items.length; ++i) {
              result = `
                  <div class="well">
                      <img class="img-rounded" src="${data.items[i].snippet.topLevelComment.snippet.authorProfileImageUrl}">
                  </div>

                    <h5>${data.items[i].snippet.topLevelComment.snippet.authorDisplayName}</h5>


                  <p>
                      ${data.items[i].snippet.topLevelComment.snippet.textDisplay}
                  </p>
              `;
              // <a href="${data.item[i].snippet.topLevelComment.snippet.authorChannelUrl}" target="_blank">
              // </a>
              $("#results").append(result);
              cmtArr.push(data.items[i].snippet.topLevelComment.snippet.textDisplay);
          }
       })
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
        if (cmtArr.length == 0) {
            alert("댓글을 먼저 불러와주세요");
        } else {
            var count = 0;
            var total = cmtArr.length;
            console.log("> video cmt length :" + total);
            for (var i=0; i<cmtArr.length; ++i) {
                //1. 하이퍼 링크 제거
                var tar_str = cmtArr[i];
                var find_index = tar_str.lastIndexOf("</a>");
                if (find_index != -1) {//하이퍼링크가 있다면
                    tar_str = cmtArr[i].substr(find_index+5, cmtArr[i].length-find_index+4);
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
                test(tar_str);
            }
            var res = count/total * 100;//퍼센트 환산
            console.log("> video cmt length :" + total);
            alert("Korean pecent : " + res.toFixed(3) + "%");
        }
    })
    //기능3. 채널 내 외국인이 가장 많이 사랑한 영상
    $('#get_best_glob').click(function(e) {
          e.preventDefault();
          var videoId = $("#videoId").val();
          $("#results").empty();
          var url = "https://www.googleapis.com/youtube/v3/playlists?part=snippet&key="+api_key+"&channelId="+videoId+"&maxResults="+maxResults;
          var result = "";
         //대표 재생목록 가져오기
         var representative = [];//대표재생목록

         getChannelData(url).then(function(data){//수행 순서 1 = getChannelData 호출
              console.log("2 :" + data[0].id);//수행순서 2 = getChannelData 콜백 호출
         }).catch(function(err) {
              console.log("2 :" + err);
         })
         //대표 재생목록 -> 소속 재생목록
         let childVideo = new Array();//소속 재생목록
         // for (var i=0; i<representative.length; ++i) {
         //    var url = "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&key="+api_key+"&playlistId="+jsonObjects.list[i].id+"&maxResults="+maxResults;
         //    $.get(url, function(data){
         //        if (!data) {alert("요청 실패");}
         //        for (var j=0; j<data.items.length; ++j) {
         //            var unit = new Object();
         //            rJson.groupId = representative[ele].id;
         //            rJson.videoid = data.items[i].resourceId.videoId;
         //            rJson.title = data.items[i].snippet.title;
         //            childVideo.push(unit);
         //        }
         //    })
         // }
         // console.log(childVideo);
        //for문 돌면서
          // 댓글 가져오고
          // 한글판별
          // 비디오 이름 + 조회수 + 댓글 퍼센트 기록
        //댓글 퍼센트 중심으로 정렬
        //테이블 형태로 보여주기
    })
})
