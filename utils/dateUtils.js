'use strict';
module.exports = {
    findMoreRecent: function(d_fb){
        var yest = new Date();
        yest.setDate(yest.getDate()-1);
        var ts = Math.round(yest.getTime());
        var post = Date.parse(d_fb);
        if (post >= ts){
            return true;
        } else {return false;}
    },
    format: function(date){
       months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    m = date.substring(5,7);
    d = date.substring(8,10);
    h = date.substring(11,13);
    ma = "am";
    if (h > 12) {
        h -= 12;
        ma = "pm";
    };
    min = date.substring(14,16);
    dstr = months[m-1]+' '+m+' '+d+' at '+h+':'+min+' '+ma;
    return dstr;
    }
}
