var scrollEvent=false;
var count=0;

$("html,body").on("mousewheel",function(c){
    const child = document.querySelector(".maincontent");
    var content=document.getElementsByClassName("maincontent");
    c.preventDefault();
    var m=c.originalEvent.wheelDelta;
    var sb=$(".maincontent").height();

    if(m>1&&scrollEvent==false&&count>=1){
        for(var i=0;i<content.length;i++){
            const cur_child=document.getElementById(content[i].id);
            var dist=cur_child.getBoundingClientRect().top;
            dist=Math.round(dist);

            if(dist==0||dist==2){
                count=i;
            }
        }
        scrollEvent=true;
        count--;
        $("html,body").stop().animate({scrollTop:sb*count},
            {duration:200,complete:function(){
                scrollEvent=false;}
        })
    }
    else if(m<1&&scrollEvent==false&&count<3){
        for(var i=0;i<content.length;i++){
            const cur_child=document.getElementById(content[i].id);
            var dist=cur_child.getBoundingClientRect().top;
            dist=Math.round(dist);

            if(dist==0||dist==2){
                count=i;
            }
        }
        scrollEvent=true;
        count++;

        $("html,body").stop().animate({scrollTop:sb*count},
            {duration:200,complete:function(){
                scrollEvent=false;
            }
        })
    }
});