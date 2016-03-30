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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNyYy9qcy9jaGFyYWN0ZXJTZWxlY3QuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIi8vIGNoYXJhY3RlclNlbGVjdC5qc1xyXG4vLyBEZWZpbmluZyB0aGUgY2hhcmFjdGVyIHNlbGVjdGlvbiB0aWNrZXRzIG9uIHRoZSBsYW5kaW5nIHBhZ2UuXHJcblxyXG4kKGZ1bmN0aW9uKCl7XHJcblx0dmFyIGNTZWwgPSAkKFwiI2NoYXJTZWxlY3RvclwiKTtcclxuXHRcclxuXHRmb3IgKHZhciBmaWxlIGluIFBMQVlFUkNIQVJTKSB7XHJcblx0XHR2YXIgZm9ybWF0ID0gUExBWUVSQ0hBUlNbZmlsZV07XHJcblx0XHR2YXIgYngsIGJ5O1xyXG5cdFx0c3dpdGNoKGZvcm1hdCkge1xyXG5cdFx0XHRjYXNlIFwiaGdfdmVydG1peC0zMlwiOlxyXG5cdFx0XHRcdGJ4ID0gNjQ7IGJ5ID0gMzI7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0YnggPSAwOyBieSA9IDA7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdCQoXCI8ZGl2PlwiKS5hcHBlbmQoXHJcblx0XHRcdCQoXCI8ZGl2PlwiKS5jc3Moe1xyXG5cdFx0XHRcdFwiYmFja2dyb3VuZC1pbWFnZVwiOiBcInVybChcIitCQVNFVVJMK1wiL2ltZy9wY3MvXCIrZmlsZStcIilcIixcclxuXHRcdFx0XHRcImJhY2tncm91bmQtcG9zaXRpb25cIjogXCItXCIrYngrXCJweCAtXCIrYnkrXCJweFwiLFxyXG5cdFx0XHR9KVxyXG5cdFx0KS5hdHRyKFwibmFtZVwiLCBmaWxlKVxyXG5cdFx0Lm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oKXtcclxuXHRcdFx0Y1NlbC5jaGlsZHJlbigpLnJlbW92ZUNsYXNzKFwic2VsZWN0ZWRcIik7XHJcblx0XHRcdCQodGhpcykuYWRkQ2xhc3MoXCJzZWxlY3RlZFwiKTtcclxuXHRcdFx0JC5jb29raWUoXCJwbGF5ZXJTcHJpdGVcIiwgJCh0aGlzKS5hdHRyKFwibmFtZVwiKSwgeyBwYXRoOiBCQVNFVVJMIH0pO1xyXG5cdFx0fSlcclxuXHRcdC5hcHBlbmRUbyhjU2VsKTtcclxuXHR9XHJcblx0XHJcbn0pO1xyXG5cclxuIl19
},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlc1xcYnJvd3NlcmlmeVxcbm9kZV9tb2R1bGVzXFxicm93c2VyLXBhY2tcXF9wcmVsdWRlLmpzIiwic3JjXFxqc1xcY2hhcmFjdGVyU2VsZWN0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIoZnVuY3Rpb24gKFBMQVlFUkNIQVJTKXtcbi8vIGNoYXJhY3RlclNlbGVjdC5qc1xyXG4vLyBEZWZpbmluZyB0aGUgY2hhcmFjdGVyIHNlbGVjdGlvbiB0aWNrZXRzIG9uIHRoZSBsYW5kaW5nIHBhZ2UuXHJcblxyXG4kKGZ1bmN0aW9uKCl7XHJcblx0dmFyIGNTZWwgPSAkKFwiI2NoYXJTZWxlY3RvclwiKTtcclxuXHRcclxuXHRmb3IgKHZhciBmaWxlIGluIFBMQVlFUkNIQVJTKSB7XHJcblx0XHR2YXIgZm9ybWF0ID0gUExBWUVSQ0hBUlNbZmlsZV07XHJcblx0XHR2YXIgYngsIGJ5O1xyXG5cdFx0c3dpdGNoKGZvcm1hdCkge1xyXG5cdFx0XHRjYXNlIFwiaGdfdmVydG1peC0zMlwiOlxyXG5cdFx0XHRcdGJ4ID0gNjQ7IGJ5ID0gMzI7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGRlZmF1bHQ6XHJcblx0XHRcdFx0YnggPSAwOyBieSA9IDA7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHR9XHJcblx0XHRcclxuXHRcdCQoXCI8ZGl2PlwiKS5hcHBlbmQoXHJcblx0XHRcdCQoXCI8ZGl2PlwiKS5jc3Moe1xyXG5cdFx0XHRcdFwiYmFja2dyb3VuZC1pbWFnZVwiOiBcInVybChcIitCQVNFVVJMK1wiL2ltZy9wY3MvXCIrZmlsZStcIilcIixcclxuXHRcdFx0XHRcImJhY2tncm91bmQtcG9zaXRpb25cIjogXCItXCIrYngrXCJweCAtXCIrYnkrXCJweFwiLFxyXG5cdFx0XHR9KVxyXG5cdFx0KS5hdHRyKFwibmFtZVwiLCBmaWxlKVxyXG5cdFx0Lm9uKFwiY2xpY2tcIiwgZnVuY3Rpb24oKXtcclxuXHRcdFx0Y1NlbC5jaGlsZHJlbigpLnJlbW92ZUNsYXNzKFwic2VsZWN0ZWRcIik7XHJcblx0XHRcdCQodGhpcykuYWRkQ2xhc3MoXCJzZWxlY3RlZFwiKTtcclxuXHRcdFx0JC5jb29raWUoXCJwbGF5ZXJTcHJpdGVcIiwgJCh0aGlzKS5hdHRyKFwibmFtZVwiKSwgeyBwYXRoOiBCQVNFVVJMIH0pO1xyXG5cdFx0fSlcclxuXHRcdC5hcHBlbmRUbyhjU2VsKTtcclxuXHR9XHJcblx0XHJcbn0pO1xyXG5cclxuXG59KS5jYWxsKHRoaXMse1wiYnVnc2V5W2hnX3ZlcnRtaXgtMzJdLnBuZ1wiOlwiaGdfdmVydG1peC0zMlwiLFwiY293Z2lybFtoZ192ZXJ0bWl4LTMyXS5wbmdcIjpcImhnX3ZlcnRtaXgtMzJcIixcImphbWVzW2hnX3ZlcnRtaXgtMzJdLnBuZ1wiOlwiaGdfdmVydG1peC0zMlwiLFwibWVsb2R5W2hnX3ZlcnRtaXgtMzJdLnBuZ1wiOlwiaGdfdmVydG1peC0zMlwiLFwicmVkW2hnX3ZlcnRtaXgtMzJdLnBuZ1wiOlwiaGdfdmVydG1peC0zMlwiLFwidHV4ZWRvW2hnX3ZlcnRtaXgtMzJdLnBuZ1wiOlwiaGdfdmVydG1peC0zMlwiLFwidmlzb3JbaGdfdmVydG1peC0zMl0ucG5nXCI6XCJoZ192ZXJ0bWl4LTMyXCIsXCJ3YW5kYVtoZ192ZXJ0bWl4LTMyXS5wbmdcIjpcImhnX3ZlcnRtaXgtMzJcIixcInlvdW5nc3RlcltoZ192ZXJ0bWl4LTMyXS5wbmdcIjpcImhnX3ZlcnRtaXgtMzJcIn0pXG4vLyMgc291cmNlTWFwcGluZ1VSTD1kYXRhOmFwcGxpY2F0aW9uL2pzb247Y2hhcnNldDp1dGYtODtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSnpiM1Z5WTJWeklqcGJJbk55WXk5cWN5OWphR0Z5WVdOMFpYSlRaV3hsWTNRdWFuTWlYU3dpYm1GdFpYTWlPbHRkTENKdFlYQndhVzVuY3lJNklqdEJRVUZCTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEVpTENKbWFXeGxJam9pWjJWdVpYSmhkR1ZrTG1weklpd2ljMjkxY21ObFVtOXZkQ0k2SWlJc0luTnZkWEpqWlhORGIyNTBaVzUwSWpwYklpOHZJR05vWVhKaFkzUmxjbE5sYkdWamRDNXFjMXh5WEc0dkx5QkVaV1pwYm1sdVp5QjBhR1VnWTJoaGNtRmpkR1Z5SUhObGJHVmpkR2x2YmlCMGFXTnJaWFJ6SUc5dUlIUm9aU0JzWVc1a2FXNW5JSEJoWjJVdVhISmNibHh5WEc0a0tHWjFibU4wYVc5dUtDbDdYSEpjYmx4MGRtRnlJR05UWld3Z1BTQWtLRndpSTJOb1lYSlRaV3hsWTNSdmNsd2lLVHRjY2x4dVhIUmNjbHh1WEhSbWIzSWdLSFpoY2lCbWFXeGxJR2x1SUZCTVFWbEZVa05JUVZKVEtTQjdYSEpjYmx4MFhIUjJZWElnWm05eWJXRjBJRDBnVUV4QldVVlNRMGhCVWxOYlptbHNaVjA3WEhKY2JseDBYSFIyWVhJZ1luZ3NJR0o1TzF4eVhHNWNkRngwYzNkcGRHTm9LR1p2Y20xaGRDa2dlMXh5WEc1Y2RGeDBYSFJqWVhObElGd2lhR2RmZG1WeWRHMXBlQzB6TWx3aU9seHlYRzVjZEZ4MFhIUmNkR0o0SUQwZ05qUTdJR0o1SUQwZ016STdYSEpjYmx4MFhIUmNkRngwWW5KbFlXczdYSEpjYmx4MFhIUmNkR1JsWm1GMWJIUTZYSEpjYmx4MFhIUmNkRngwWW5nZ1BTQXdPeUJpZVNBOUlEQTdYSEpjYmx4MFhIUmNkRngwWW5KbFlXczdYSEpjYmx4MFhIUjlYSEpjYmx4MFhIUmNjbHh1WEhSY2RDUW9YQ0k4WkdsMlBsd2lLUzVoY0hCbGJtUW9YSEpjYmx4MFhIUmNkQ1FvWENJOFpHbDJQbHdpS1M1amMzTW9lMXh5WEc1Y2RGeDBYSFJjZEZ3aVltRmphMmR5YjNWdVpDMXBiV0ZuWlZ3aU9pQmNJblZ5YkNoY0lpdENRVk5GVlZKTUsxd2lMMmx0Wnk5d1kzTXZYQ0lyWm1sc1pTdGNJaWxjSWl4Y2NseHVYSFJjZEZ4MFhIUmNJbUpoWTJ0bmNtOTFibVF0Y0c5emFYUnBiMjVjSWpvZ1hDSXRYQ0lyWW5nclhDSndlQ0F0WENJcllua3JYQ0p3ZUZ3aUxGeHlYRzVjZEZ4MFhIUjlLVnh5WEc1Y2RGeDBLUzVoZEhSeUtGd2libUZ0WlZ3aUxDQm1hV3hsS1Z4eVhHNWNkRngwTG05dUtGd2lZMnhwWTJ0Y0lpd2dablZ1WTNScGIyNG9LWHRjY2x4dVhIUmNkRngwWTFObGJDNWphR2xzWkhKbGJpZ3BMbkpsYlc5MlpVTnNZWE56S0Z3aWMyVnNaV04wWldSY0lpazdYSEpjYmx4MFhIUmNkQ1FvZEdocGN5a3VZV1JrUTJ4aGMzTW9YQ0p6Wld4bFkzUmxaRndpS1R0Y2NseHVYSFJjZEZ4MEpDNWpiMjlyYVdVb1hDSndiR0Y1WlhKVGNISnBkR1ZjSWl3Z0pDaDBhR2x6S1M1aGRIUnlLRndpYm1GdFpWd2lLU3dnZXlCd1lYUm9PaUJDUVZORlZWSk1JSDBwTzF4eVhHNWNkRngwZlNsY2NseHVYSFJjZEM1aGNIQmxibVJVYnloalUyVnNLVHRjY2x4dVhIUjlYSEpjYmx4MFhISmNibjBwTzF4eVhHNWNjbHh1SWwxOSJdfQ==
