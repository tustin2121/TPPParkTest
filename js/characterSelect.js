(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (PLAYERCHARS){
// characterSelect.js
// Defining the character selection tickets on the landing page.

$(function(){
	var cSel = $("#charSelector");
	
	for (var file in PLAYERCHARS) {
		var format = PLAYERCHARS[file];
		var bx, by;
		switch(format) {
			case "hg_vertmix-32":
				bx = 64; by = 32;
				break;
			default:
				bx = 0; by = 0;
				break;
		}
		
		$("<div>").append(
			$("<div>").css({
				"background-image": "url("+BASEURL+"/img/pcs/"+file+")",
				"background-position": "-"+bx+"px -"+by+"px",
			})
		).attr("name", file)
		.on("click", function(){
			cSel.children().removeClass("selected");
			$(this).addClass("selected");
			$.cookie("playerSprite", $(this).attr("name"), { path: BASEURL });
		})
		.appendTo(cSel);
	}
	
});


}).call(this,{"bugsey[hg_vertmix-32].png":"hg_vertmix-32","cowgirl[hg_vertmix-32].png":"hg_vertmix-32","james[hg_vertmix-32].png":"hg_vertmix-32","melody[hg_vertmix-32].png":"hg_vertmix-32","tuxedo[hg_vertmix-32].png":"hg_vertmix-32","visor[hg_vertmix-32].png":"hg_vertmix-32","wanda[hg_vertmix-32].png":"hg_vertmix-32","youngster[hg_vertmix-32].png":"hg_vertmix-32"})
},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwic3JjXFxqc1xcY2hhcmFjdGVyU2VsZWN0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiKGZ1bmN0aW9uIChQTEFZRVJDSEFSUyl7XG4vLyBjaGFyYWN0ZXJTZWxlY3QuanNcclxuLy8gRGVmaW5pbmcgdGhlIGNoYXJhY3RlciBzZWxlY3Rpb24gdGlja2V0cyBvbiB0aGUgbGFuZGluZyBwYWdlLlxyXG5cclxuJChmdW5jdGlvbigpe1xyXG5cdHZhciBjU2VsID0gJChcIiNjaGFyU2VsZWN0b3JcIik7XHJcblx0XHJcblx0Zm9yICh2YXIgZmlsZSBpbiBQTEFZRVJDSEFSUykge1xyXG5cdFx0dmFyIGZvcm1hdCA9IFBMQVlFUkNIQVJTW2ZpbGVdO1xyXG5cdFx0dmFyIGJ4LCBieTtcclxuXHRcdHN3aXRjaChmb3JtYXQpIHtcclxuXHRcdFx0Y2FzZSBcImhnX3ZlcnRtaXgtMzJcIjpcclxuXHRcdFx0XHRieCA9IDY0OyBieSA9IDMyO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRkZWZhdWx0OlxyXG5cdFx0XHRcdGJ4ID0gMDsgYnkgPSAwO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0fVxyXG5cdFx0XHJcblx0XHQkKFwiPGRpdj5cIikuYXBwZW5kKFxyXG5cdFx0XHQkKFwiPGRpdj5cIikuY3NzKHtcclxuXHRcdFx0XHRcImJhY2tncm91bmQtaW1hZ2VcIjogXCJ1cmwoXCIrQkFTRVVSTCtcIi9pbWcvcGNzL1wiK2ZpbGUrXCIpXCIsXHJcblx0XHRcdFx0XCJiYWNrZ3JvdW5kLXBvc2l0aW9uXCI6IFwiLVwiK2J4K1wicHggLVwiK2J5K1wicHhcIixcclxuXHRcdFx0fSlcclxuXHRcdCkuYXR0cihcIm5hbWVcIiwgZmlsZSlcclxuXHRcdC5vbihcImNsaWNrXCIsIGZ1bmN0aW9uKCl7XHJcblx0XHRcdGNTZWwuY2hpbGRyZW4oKS5yZW1vdmVDbGFzcyhcInNlbGVjdGVkXCIpO1xyXG5cdFx0XHQkKHRoaXMpLmFkZENsYXNzKFwic2VsZWN0ZWRcIik7XHJcblx0XHRcdCQuY29va2llKFwicGxheWVyU3ByaXRlXCIsICQodGhpcykuYXR0cihcIm5hbWVcIiksIHsgcGF0aDogQkFTRVVSTCB9KTtcclxuXHRcdH0pXHJcblx0XHQuYXBwZW5kVG8oY1NlbCk7XHJcblx0fVxyXG5cdFxyXG59KTtcclxuXHJcblxufSkuY2FsbCh0aGlzLHtcImJ1Z3NleVtoZ192ZXJ0bWl4LTMyXS5wbmdcIjpcImhnX3ZlcnRtaXgtMzJcIixcImNvd2dpcmxbaGdfdmVydG1peC0zMl0ucG5nXCI6XCJoZ192ZXJ0bWl4LTMyXCIsXCJqYW1lc1toZ192ZXJ0bWl4LTMyXS5wbmdcIjpcImhnX3ZlcnRtaXgtMzJcIixcIm1lbG9keVtoZ192ZXJ0bWl4LTMyXS5wbmdcIjpcImhnX3ZlcnRtaXgtMzJcIixcInR1eGVkb1toZ192ZXJ0bWl4LTMyXS5wbmdcIjpcImhnX3ZlcnRtaXgtMzJcIixcInZpc29yW2hnX3ZlcnRtaXgtMzJdLnBuZ1wiOlwiaGdfdmVydG1peC0zMlwiLFwid2FuZGFbaGdfdmVydG1peC0zMl0ucG5nXCI6XCJoZ192ZXJ0bWl4LTMyXCIsXCJ5b3VuZ3N0ZXJbaGdfdmVydG1peC0zMl0ucG5nXCI6XCJoZ192ZXJ0bWl4LTMyXCJ9KSJdfQ==
