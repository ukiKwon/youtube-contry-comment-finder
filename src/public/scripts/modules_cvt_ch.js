//유니코드 참조 : https://unicode-table.com/kr/blocks/
//한글 여부 판단
function is_hangul_char(ch) {
    c = ch.charCodeAt(0);
    if( 0x1100<=c && c<=0x11FF ) return true;
    if( 0x3130<=c && c<=0x318F ) return true;
    if( 0xAC00<=c && c<=0xD7A3 ) return true;
    return false;
}
//특수문자 판단
function is_emoticon_char(ch) {
    c = ch.charCodeAt(0);
    if( 0x20A0<=c && c <= 0x2BFF ) return true;
    else if( 0x1F000<=c && c<=0xE01EF ) return true;
    return false;
}
//문자 형태 판단
function test(ch) {
    console.log("["+ch+"]");
    if(is_hangul_char(ch)) console.log("hangul.");
    else if(is_emoticon_char(ch)) console.log("special character.");
    else console.log("not hangul.");
}
