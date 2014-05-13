// gen4.js
// File for TPP Platinum events
// - or -
// HOW THE HELL DO I CODE NAMES WITH FREAKING UMBRELLAS IN THEM?!?! O_o
//

// Released Pokemon: Their stories are finished, they can enter the Park

addEvent(new Pokemon({
	name : "Oreo",
	sprite: "img/pkmn/bidoof-oreo.png",
	x: 14, y: -29,
	
	// dex : "img/pkdx/emdex_cruella.png",
	// sources : {
	// 	"Pokedex Image by /u/NoPenNameGirl" : "http://www.reddit.com/r/twitchplayspokemon/comments/22kx4y/the_ateam_sprite/",
	// },
	
	OT: "nqpppnl",
	gender: 2,
	gamename : "1 OORROOOO",
	pokename : "Bidoof",
	nicknames : "Special Agent Zigzagoon",
	level : 15,
	// memo : "",
	
	ribbons : [
		new Released_Ribbon("0d 5h 34m"),
		new Record_Ribbon("Fastest Release"),
	],
}));

//
// Note: Chimchar is attached to the Released Starter Campfire multi-event 
// defined in the "other" events file. See there for her event definition.
//

addEvent(new Pokemon({
	name : "Bidoof",
	// sprite: "img/pkmn/bidoof.png",
	x: 7, y: -24,
	
	// dex : "img/pkdx/emdex_cruella.png",
	// sources : {
	// 	"Pokedex Image by /u/NoPenNameGirl" : "http://www.reddit.com/r/twitchplayspokemon/comments/22kx4y/the_ateam_sprite/",
	// },
	
	OT: "nqpppnl",
	gender: 2,
	// gamename : "O_o",
	pokename : "Bidoof",
	nicknames : "",
	// level : 5,
	// memo : "",
	
	ribbons : [
		new Pokerus_Ribbon(),
		new Released_Ribbon("8d 14h 35m"),
	],
}));

addEvent(new Pokemon({
	name: "Geodude",
	sprite: "img/pkmn/shiny-geodude.gif",
	x: -43, y: -10,
	
	dex: "http://cdn.bulbagarden.net/upload/b/b0/Spr_4p_074_s.png", //Bulbapedia
	
	OT: "--",
	gamename: "--",
	pokename: "Geodude",
	caught: "Encountered by nqpppnl.",
	level: "???",
	memo: "TPP's third random shiny, killed in battle.",
}));


// Current Party Pokemon: DO NOT uncomment sprites until they win the Hall of Fame ribbon!

addEvent(new Pokemon({
	name : "Steve",
	// sprite: "img/pkmn/bronzong.png",
	// x: -37, y: -25,
	
	// dex : "img/pkdx/emdex_cruella.png",
	// sources : {
	// 	"Pokedex Image by /u/NoPenNameGirl" : "http://www.reddit.com/r/twitchplayspokemon/comments/22kx4y/the_ateam_sprite/",
	// },
	
	OT: "nqpppnl",
	gender: 0,
	// gamename : "Bronzong",
	pokename : "Bronzong",
	nicknames : "Captain America",
	// level : 5,
	memo : "First to contract the Pokerus virus, named Captain America for this feat.",
	
	ribbons : [
		new Record_Ribbon("First to catch PkRS"),
		new Pokerus_Ribbon(),
		//new Daycare_Ribbon("To Learn Something"),
	],
}));

addEvent(new Pokemon({
	name : "Sunbrella",
	// sprite: "img/pkmn/sunberella.png",
	// x: -37, y: -25,
	
	// dex : "img/pkdx/emdex_cruella.png",
	// sources : {
	// 	"Pokedex Image by /u/NoPenNameGirl" : "http://www.reddit.com/r/twitchplayspokemon/comments/22kx4y/the_ateam_sprite/",
	// },
	
	OT: "nqpppnl",
	gender: 2,
	// gamename : "O_o",
	pokename : "Roselia",
	// level : 5,
	memo : "Evolved via Rare Candy by anti-evolution trolls spamming the menu button.",
	
	ribbons : [
		new Daycare_Ribbon("To Learn Petal Dance"),
		new Pokerus_Ribbon(),
	],
}));

addEvent(new Pokemon({
	name : "Shinx",
	// sprite: "img/pkmn/sunshine_shinx.png",
	// x: -37, y: -25,
	
	// dex : "img/pkdx/emdex_cruella.png",
	// sources : {
	// 	"Pokedex Image by /u/NoPenNameGirl" : "http://www.reddit.com/r/twitchplayspokemon/comments/22kx4y/the_ateam_sprite/",
	// },
	
	OT: "nqpppnl",
	gender: 2,
	// gamename : "O_o",
	pokename : "Shinx",
	nicknames : "Sparkles<br/>Sunshine",
	// level : 5,
	// memo : "",
	ball : "heal",	
	
	ribbons : [
		new Daycare_Ribbon("To Learn Discharge"),
		new Pokerus_Ribbon(),
	],
}));

addEvent(new Pokemon({
	name : "Flareon",
	// sprite: "img/pkmn/sunshine_shinx.png",
	// x: -37, y: -25,
	
	// dex : "img/pkdx/emdex_cruella.png",
	// sources : {
	// 	"Pokedex Image by /u/NoPenNameGirl" : "http://www.reddit.com/r/twitchplayspokemon/comments/22kx4y/the_ateam_sprite/",
	// },
	
	OT: "nqpppnl",
	gender: 1,
	// gamename : "O_o",
	pokename : "Flareon",
	nicknames : "",
	// level : 5,
	// memo : "",
	
	ribbons : [
		new Pokerus_Ribbon(),
	],
}));

addEvent(new Pokemon({
	name : "Agent 006",
	// sprite: "img/pkmn/agent_bibarel.png",
	x: 7, y: -24,
	
	// dex : "img/pkdx/emdex_cruella.png",
	// sources : {
	// 	"Pokedex Image by /u/NoPenNameGirl" : "http://www.reddit.com/r/twitchplayspokemon/comments/22kx4y/the_ateam_sprite/",
	// },
	
	OT: "nqpppnl",
	gender: 2,
	gamename : "00&nbsp;&nbsp;00&nbsp;06",
	pokename : "Bibarel",
	nicknames : "",
	// level : 5,
	// memo : "",
	
	ribbons : [
		// new Pokerus_Ribbon(), //caught after the outbreak
	],
}));

addEvent(new Pokemon({
	name : "Golbat",
	// sprite: "img/pkmn/sunshine_shinx.png",
	// x: -37, y: -25,
	
	// dex : "img/pkdx/emdex_cruella.png",
	// sources : {
	// 	"Pokedex Image by /u/NoPenNameGirl" : "http://www.reddit.com/r/twitchplayspokemon/comments/22kx4y/the_ateam_sprite/",
	// },
	
	OT: "nqpppnl",
	gender: 2,
	// gamename : "O_o",
	pokename : "Golbat",
	nicknames : "",
	// level : 5,
	// memo : "",
	
	ribbons : [
		new Pokerus_Ribbon(),
	],
}));

addEvent(new Pokemon({
	name : "Togepi",
	// sprite: "img/pkmn/sunshine_shinx.png",
	// x: -37, y: -25,
	
	// dex : "img/pkdx/emdex_cruella.png",
	// sources : {
	// 	"Pokedex Image by /u/NoPenNameGirl" : "http://www.reddit.com/r/twitchplayspokemon/comments/22kx4y/the_ateam_sprite/",
	// },
	
	OT: "nqpppnl",
	gender: 2,
	// gamename : "O_o",
	pokename : "Togepi",
	nicknames : "",
	// level : 5,
	// memo : "",
	
	ribbons : [
		new Daycare_Ribbon("Common Resident"),
		new Pokerus_Ribbon(),
	],
}));


// And finally, Nepoleon himself!
addEvent(new Trainer({
	name : "nqpppnl",
	// spritesheet : "img/trainers/aj.png",
	// x: 20, y: 2,
	
	dex : "http://cdn.bulbagarden.net/upload/6/6b/Spr_Pt_Lucas.png",
	sources : {
		"Lucas Sprite from Bulbapedia":"", 
	},
	
	nickname : "Napoleon",
	// playtime: "15d 2h 2m",
	// pokedex : "56 own/303 seen",
	// releasecount : 4,
	idnum : "12339",
	
	info_html : 
		"Number of E4 Attempts: ?<br/>"+
		"Times Blacked Out: ?<br/>"+
		"Number of Wooper Caught: 17<br/>"+
		"Bibarel: 16, Bidoof: 11<br/>"+
		"",
	icons : [
		null,//"img/icn/teachy_tv.png",
		null,//"img/icn/dome_fossil.png",
		null,//"img/icn/poke_doll.png",
		null,//"img/icn/amber_charizard.png",
		null,//"img/pkmn/potato.png",
		null,//"img/icn/slowpoke_tail.png",
	],
	
	badge_html : "",
	
	behavior: null,
	// behavior: behavior.meander,
	// behavArg : {
	// 	"left" : -10, "top" : -38,
	// 	"right": -10, "bottom": -37,
	// },
}));
