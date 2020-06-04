/*TABLE 생성*/

# 그룹 댓글 통계값 테이
CREATE TABLE GROUP_COMMENT (
  cid VARCHAR(30) NULL,
  gid VARCHAR(30) NOT NULL,
  g_korpercent FLOAT DEFAULT 0,
  PRIMARY KEY(cid),
  FOREIGN KEY(gid) REFERENCES GROUP_INFO(gid)
);

#그룹 재생목록 기본 정보
CREATE TABLE GROUP_INFO (
  gid VARCHAR(30) NOT NULL,
  vid VARCHAR(15) NOT NULL,
  PRIMARY KEY(gid)
);

#비디오 기본 정보
CREATE TABLE VIDEO_INFO (
  vid VARCHAR(15) NOT NULL,
  title VARCHAR(255) NULL,
  img VARCHAR(255) NULL,
  korpercent FLOAT DEFAULT 0,
  comment_count INT DEFAULT 0,
  state VARCHAR(10) DEFAULT 'ready',
  PRIMARY KEY(vid),
  CONSTRAINT CHK_STATE CHECK (state = 'ready'
                              OR state ='more'
                              OR state = 'less'
                              OR state ='done')
);
