var scrollEvent=false;
var count=0;

$("html,body").on("mousewheel",function(c){
    const child = document.querySelector(".maincontent");
    const distanceFromViewport = child.getBoundingClientRect().top
    //count=parseInt((-distanceFromViewport)/720);
    console.log("거리 : "+distanceFromViewport);
    console.log('카운트 : '+count)
    c.preventDefault();
    var m=c.originalEvent.wheelDelta;
    var sb=$(".maincontent").height();

    if(m>1&&scrollEvent==false&&count>=1){
        scrollEvent=true;
        count--;
        $("html,body").stop().animate({scrollTop:sb*count},
            {duration:200,complete:function(){
                scrollEvent=false;}
        })
    }
    else if(m<1&&scrollEvent==false&&count<3){
        scrollEvent=true;
        count++;

        $("html,body").stop().animate({scrollTop:sb*count},
            {duration:200,complete:function(){
                scrollEvent=false;
            }
        })
    }
});