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
