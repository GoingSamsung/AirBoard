// Scroll Animation (sa, 스크롤 애니메이션)
const saTriggerMargin = 300;
const saElementList = document.querySelectorAll('.sa');

$(function(){
    slider = this.getElementById("slider");
    $(window).bind({scroll: winScroll});
});

const saFunc = function() {
for (const element of saElementList) {
    if (!element.classList.contains('show')) {
    if (window.innerHeight > element.getBoundingClientRect().top + saTriggerMargin) {
        element.classList.add('show');
    }
    }
}
}

window.addEventListener('load', saFunc);
window.addEventListener('scroll', saFunc);

function winScroll(){
    const slider = document.getElementById("slider");
    var op = 1 - (window.pageYOffset / slider.offsetHeight);
    slider.style.opacity = op; 
}