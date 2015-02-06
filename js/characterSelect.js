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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwic3JjXFxqc1xcY2hhcmFjdGVyU2VsZWN0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOztBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLy8gY2hhcmFjdGVyU2VsZWN0LmpzXHJcbi8vIERlZmluaW5nIHRoZSBjaGFyYWN0ZXIgc2VsZWN0aW9uIHRpY2tldHMgb24gdGhlIGxhbmRpbmcgcGFnZS5cclxuXHJcbiQoZnVuY3Rpb24oKXtcclxuXHR2YXIgY1NlbCA9ICQoXCIjY2hhclNlbGVjdG9yXCIpO1xyXG5cdFxyXG5cdGZvciAodmFyIGZpbGUgaW4gUExBWUVSQ0hBUlMpIHtcclxuXHRcdHZhciBmb3JtYXQgPSBQTEFZRVJDSEFSU1tmaWxlXTtcclxuXHRcdHZhciBieCwgYnk7XHJcblx0XHRzd2l0Y2goZm9ybWF0KSB7XHJcblx0XHRcdGNhc2UgXCJoZ192ZXJ0bWl4LTMyXCI6XHJcblx0XHRcdFx0YnggPSA2NDsgYnkgPSAzMjtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0ZGVmYXVsdDpcclxuXHRcdFx0XHRieCA9IDA7IGJ5ID0gMDtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHRcdFxyXG5cdFx0JChcIjxkaXY+XCIpLmFwcGVuZChcclxuXHRcdFx0JChcIjxkaXY+XCIpLmNzcyh7XHJcblx0XHRcdFx0XCJiYWNrZ3JvdW5kLWltYWdlXCI6IFwidXJsKFwiK0JBU0VVUkwrXCIvaW1nL3Bjcy9cIitmaWxlK1wiKVwiLFxyXG5cdFx0XHRcdFwiYmFja2dyb3VuZC1wb3NpdGlvblwiOiBcIi1cIitieCtcInB4IC1cIitieStcInB4XCIsXHJcblx0XHRcdH0pXHJcblx0XHQpLmF0dHIoXCJuYW1lXCIsIGZpbGUpXHJcblx0XHQub24oXCJjbGlja1wiLCBmdW5jdGlvbigpe1xyXG5cdFx0XHRjU2VsLmNoaWxkcmVuKCkucmVtb3ZlQ2xhc3MoXCJzZWxlY3RlZFwiKTtcclxuXHRcdFx0JCh0aGlzKS5hZGRDbGFzcyhcInNlbGVjdGVkXCIpO1xyXG5cdFx0XHQkLmNvb2tpZShcInBsYXllclNwcml0ZVwiLCAkKHRoaXMpLmF0dHIoXCJuYW1lXCIpLCB7IHBhdGg6IEJBU0VVUkwgfSk7XHJcblx0XHR9KVxyXG5cdFx0LmFwcGVuZFRvKGNTZWwpO1xyXG5cdH1cclxuXHRcclxufSk7XHJcblxyXG4iXX0=
