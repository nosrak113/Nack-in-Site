

var bgcol=new Array("rgb(188,188,186)","black","white");
var ticol=new Array("rgb(37,37,37)","rgb(203,251,52)","rgb(220,220,220)","rgb(251,67,32)","rgb(126,221,223)","rgb(46,161,215)","rgb(240,150,49)","rgb(53,153,73)","rgb(227,34,46)","rgb(125,83,159)","rgb(151,104,45)","rgb(36,171,169)","rgb(221,117,173)","rgb(140,190,72)","rgb(235	,40	,145)");
var h1col=new Array("white","white","black");
var tecol=new Array("white","black");
var l1=ticol.length;
var rnd=Math.floor(Math.random()*l1);
var rnd2=Math.floor(Math.random()*3);
var rnd3=Math.floor(Math.random()*2);
if (rnd ===0) {rnd3=0};//black on back,no
if (rnd ===1) {rnd3=1};//white on green,no


chcl();

$(document).ready(function() {
        $('a').hover(
          function() {
              $(this).css({ background: 'red' });
          },
          function() {
              $(this).css("background-color", ticol[rnd]);
          }
        );
        rs();

    });

$(window).resize(function() {
  rs();
});


function rs()
{
$('.box').height(parseInt($("body").width()*(.31)));
$('.box').width(parseInt($("body").width()*(.31))); 	
}

function chcl()
{
rnd=Math.floor(Math.random()*l1);
rnd2=Math.floor(Math.random()*3);
rnd3=Math.floor(Math.random()*2);
if (rnd ===0) {rnd3=0};//black on back,no
if (rnd ===1) {rnd3=1};//white on green,no
document.body.style.background=bgcol[rnd2];
//$('body').css("background-color", bgcol[rnd]);
$('a').css("background-color", ticol[rnd]);
$('a').css("color", tecol[rnd3]);
$('header').css("color", h1col[rnd2]);






}
