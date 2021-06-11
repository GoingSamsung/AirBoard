export var thu = [0,1,0,1];
export var ind = [0,1,0,1];
export var mid = [0,1,0,1];
export var rin = [0,1,0,1];
export var pin = [0,1,0,1];

// exports.a = function(){
//     return thu;
// };
// exports.b = function(){
//     return ind;
// };
// exports.c = function(){
//     return mid;
// };
// exports.d = function(){
//     return rin;
// };
// exports.e = function(){
//     return pin;
// };


console.log(thu);
const thuElement = document.querySelector('.ThumbCurl');
thuElement.addEventListener('change',(event)=>{
    console.log("asdf");
    if(event.target.value=='NoCurl') thu[0] = 1;
    else if(event.target.value=='HalfCurl') thu[0] = 2;
    else thu[0] = 3;
    console.log(thu[0]);
    tmp = thu;
    console.log(tmp);
})
const thuNumElement = document.querySelector('.ThumbCurlNum');
thuNumElement.addEventListener('change',(event)=>{
    if(event.target.value=='1') thu[1] = 0.25;
    else if(event.target.value=='2') thu[1] = 0.5;
    else if(event.target.value=='3') thu[1] = 0.75;
    else thu[1] = 1.0
})
const thuDirElement = document.querySelector('.ThumbDir');
thuDirElement.addEventListener('change',(event)=>{
    if(event.target.value=='1') thu[2] = VirticalUp;
    else if(event.target.value=='2') thu[2] = DiagonalUpRight;
    else if(event.target.value=='3') thu[2] = HorizontalRight;
    else if(event.target.value=='4') thu[2] = DiagonalDownRight;
    else if(event.target.value=='5') thu[2] = VirticalDown;
    else if(event.target.value=='6') thu[2] = DiagonalDownLeft;
    else if(event.target.value=='7') thu[2] = HorizontalLeft;
    else if(event.target.value=='8') thu[2] = DiagonalUpLeft;
})
const thuDirNumElement = document.querySelector('.ThumbDirNum');
thuDirNumElement.addEventListener('change',(event)=>{
    if(event.target.value=='1') thu[3] = 0.25;
    else if(event.target.value=='2') thu[3] = 0.5;
    else if(event.target.value=='3') thu[3] = 0.75;
    else if(event.target.value=='4') thu[3] = 1.0;
})
const indElement = document.querySelector('.IndexCurl');
indElement.addEventListener('change',(event)=>{
    if(event.target.value=='Nocurl') ind[0] = NoCurl;
    else if(event.target.value=='Halfcurl') ind[0] = HalfCurl;
    else ind[0] = FullCurl;
})
const indNumElement = document.querySelector('.IndexCurlNum');
indNumElement.addEventListener('change',(event)=>{
    if(event.target.value=='1') ind[1] = 0.25;
    else if(event.target.value=='2') ind[1] = 0.5;
    else if(event.target.value=='3') ind[1] = 0.75;
    else ind[1] = 1.0
})
const indDirElement = document.querySelector('.IndexDir');
indDirElement.addEventListener('change',(event)=>{
    if(event.target.value=='1') ind[2] = VirticalUp;
    else if(event.target.value=='2') ind[2] = DiagonalUpRight;
    else if(event.target.value=='3') ind[2] = HorizontalRight;
    else if(event.target.value=='4') ind[2] = DiagonalDownRight;
    else if(event.target.value=='5') ind[2] = VirticalDown;
    else if(event.target.value=='6') ind[2] = DiagonalDownLeft;
    else if(event.target.value=='7') ind[2] = HorizontalLeft;
    else if(event.target.value=='8') ind[2] = DiagonalUpLeft;
})
const indDirNumElement = document.querySelector('.IndexDirNum');
indDirNumElement.addEventListener('change',(event)=>{
    if(event.target.value=='1') ind[3] = 0.25;
    else if(event.target.value=='2') ind[3] = 0.5;
    else if(event.target.value=='3') ind[3] = 0.75;
    else if(event.target.value=='4') ind[3] = 1.0;
})
const midElement = document.querySelector('.MiddleCurl');
midElement.addEventListener('change',(event)=>{
    if(event.target.value=='Nocurl') mid[0] = NoCurl;
    else if(event.target.value=='Halfcurl') mid[0] = HalfCurl;
    else mid[0] = FullCurl;
})
const midNumElement = document.querySelector('.MiddleCurlNum');
midNumElement.addEventListener('change',(event)=>{
    if(event.target.value=='1') mid[1] = 0.25;
    else if(event.target.value=='2') mid[1] = 0.5;
    else if(event.target.value=='3') mid[1] = 0.75;
    else mid[1] = 1.0
})
const midDirElement = document.querySelector('.MiddleDir');
midDirElement.addEventListener('change',(event)=>{
    if(event.target.value=='1') mid[2] = VirticalUp;
    else if(event.target.value=='2') mid[2] = DiagonalUpRight;
    else if(event.target.value=='3') mid[2] = HorizontalRight;
    else if(event.target.value=='4') mid[2] = DiagonalDownRight;
    else if(event.target.value=='5') mid[2] = VirticalDown;
    else if(event.target.value=='6') mid[2] = DiagonalDownLeft;
    else if(event.target.value=='7') mid[2] = HorizontalLeft;
    else if(event.target.value=='8') mid[2] = DiagonalUpLeft;
})
const midDirNumElement = document.querySelector('.MiddleDirNum');
midDirNumElement.addEventListener('change',(event)=>{
    if(event.target.value=='1') mid[3] = 0.25;
    else if(event.target.value=='2') mid[3] = 0.5;
    else if(event.target.value=='3') mid[3] = 0.75;
    else if(event.target.value=='4') mid[3] = 1.0;
})
const rinElement = document.querySelector('.RingCurl');
rinElement.addEventListener('change',(event)=>{
    if(event.target.value=='Nocurl') rin[0] = NoCurl;
    else if(event.target.value=='Halfcurl') rin[0] = HalfCurl;
    else rin[0] = FullCurl;
})
const rinNumElement = document.querySelector('.RingCurlNum');
rinNumElement.addEventListener('change',(event)=>{
    if(event.target.value=='1') rin[1] = 0.25;
    else if(event.target.value=='2') rin[1] = 0.5;
    else if(event.target.value=='3') rin[1] = 0.75;
    else rin[1] = 1.0
})
const rinDirElement = document.querySelector('.RingDir');
rinDirElement.addEventListener('change',(event)=>{
    if(event.target.value=='1') rin[2] = VirticalUp;
    else if(event.target.value=='2') rin[2] = DiagonalUpRight;
    else if(event.target.value=='3') rin[2] = HorizontalRight;
    else if(event.target.value=='4') rin[2] = DiagonalDownRight;
    else if(event.target.value=='5') rin[2] = VirticalDown;
    else if(event.target.value=='6') rin[2] = DiagonalDownLeft;
    else if(event.target.value=='7') rin[2] = HorizontalLeft;
    else if(event.target.value=='8') rin[2] = DiagonalUpLeft;
})
const rinDirNumElement = document.querySelector('.RingDirNum');
rinDirNumElement.addEventListener('change',(event)=>{
    if(event.target.value=='1') rin[3] = 0.25;
    else if(event.target.value=='2') rin[3] = 0.5;
    else if(event.target.value=='3') rin[3] = 0.75;
    else if(event.target.value=='4') rin[3] = 1.0;
})
const pinElement = document.querySelector('.PinkyCurl');
pinElement.addEventListener('change',(event)=>{
    if(event.target.value=='Nocurl') pin[0] = NoCurl;
    else if(event.target.value=='Halfcurl') pin[0] = HalfCurl;
    else pin[0] = FullCurl;
})
const pinNumElement = document.querySelector('.PinkyCurlNum');
pinNumElement.addEventListener('change',(event)=>{
    if(event.target.value=='1') pin[1] = 0.25;
    else if(event.target.value=='2') pin[1] = 0.5;
    else if(event.target.value=='3') pin[1] = 0.75;
    else pin[1] = 1.0
})
const pinDirElement = document.querySelector('.PinkyDir');
pinDirElement.addEventListener('change',(event)=>{
    if(event.target.value=='1') pin[2] = VirticalUp;
    else if(event.target.value=='2') pin[2] = DiagonalUpRight;
    else if(event.target.value=='3') pin[2] = HorizontalRight;
    else if(event.target.value=='4') pin[2] = DiagonalDownRight;
    else if(event.target.value=='5') pin[2] = VirticalDown;
    else if(event.target.value=='6') pin[2] = DiagonalDownLeft;
    else if(event.target.value=='7') pin[2] = HorizontalLeft;
    else if(event.target.value=='8') pin[2] = DiagonalUpLeft;
})
const pinDirNumElement = document.querySelector('.PinkyDirNum');
pinDirNumElement.addEventListener('change',(event)=>{
    if(event.target.value=='1') pin[3] = 0.25;
    else if(event.target.value=='2') pin[3] = 0.5;
    else if(event.target.value=='3') pin[3] = 0.75;
    else if(event.target.value=='4') pin[3] = 1.0;
})