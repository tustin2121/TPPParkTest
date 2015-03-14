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


}).call(this,{"bugsey[hg_vertmix-32].png":"hg_vertmix-32","cowgirl[hg_vertmix-32].png":"hg_vertmix-32","james[hg_vertmix-32].png":"hg_vertmix-32","melody[hg_vertmix-32].png":"hg_vertmix-32","red[hg_vertmix-32].png":"hg_vertmix-32","tuxedo[hg_vertmix-32].png":"hg_vertmix-32","visor[hg_vertmix-32].png":"hg_vertmix-32","wanda[hg_vertmix-32].png":"hg_vertmix-32","youngster[hg_vertmix-32].png":"hg_vertmix-32"})

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwic3JjL2pzL2NoYXJhY3RlclNlbGVjdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIGNoYXJhY3RlclNlbGVjdC5qc1xyXG4vLyBEZWZpbmluZyB0aGUgY2hhcmFjdGVyIHNlbGVjdGlvbiB0aWNrZXRzIG9uIHRoZSBsYW5kaW5nIHBhZ2UuXHJcblxyXG4kKGZ1bmN0aW9uKCl7XHJcblx0dmFyIGNTZWwgPSAkKFwiI2NoYXJTZWxlY3RvclwiKTtcclxuXHRcclxuXHRmb3IgKHZhciBmaWxlIGluIFBMQVlFUkNIQVJTKSB7XHJcblx0XHR2YXIgZm9ybWF0ID0gUExBWUVSQ0hBUlNbZmlsZV07XHJcblx0XHR2YXIgYngsIGJ5O1xyXG5cdFx0c3dpdGNoKGZvcm1hdCkge1xyXG5cdFx0XHRjYXNlIFwiaGdfdmVydG1peC0zMlwiOlxyXG5cdFx0XHRcdGJ4ID0gNjQ7IGJ5ID0gMzI7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0YnggPSAwOyBieSA9IDA7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdCQoXCI8ZGl2PlwiKS5hcHBlbmQoXHJcblx0XHRcdCQoXCI8ZGl2PlwiKS5jc3Moe1xyXG5cdFx0XHRcdFwiYmFja2dyb3VuZC1pbWFnZVwiOiBcInVybChcIitCQVNFVVJMK1wiL2ltZy9wY3MvXCIrZmlsZStcIilcIixcclxuXHRcdFx0XHRcImJhY2tncm91bmQtcG9zaXRpb25cIjogXCItXCIrYngrXCJweCAtXCIrYnkrXCJweFwiLFxyXG5cdFx0XHR9KVxyXG5cdFx0KS5hdHRyKFwibmFtZVwiLCBmaWxlKVxyXG5cdFx0Lm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oKXtcclxuXHRcdFx0Y1NlbC5jaGlsZHJlbigpLnJlbW92ZUNsYXNzKFwic2VsZWN0ZWRcIik7XHJcblx0XHRcdCQodGhpcykuYWRkQ2xhc3MoXCJzZWxlY3RlZFwiKTtcclxuXHRcdFx0JC5jb29raWUoXCJwbGF5ZXJTcHJpdGVcIiwgJCh0aGlzKS5hdHRyKFwibmFtZVwiKSwgeyBwYXRoOiBCQVNFVVJMIH0pO1xyXG5cdFx0fSlcclxuXHRcdC5hcHBlbmRUbyhjU2VsKTtcclxuXHR9XHJcblx0XHJcbn0pO1xyXG5cclxuIl19
