/* Built-in maps and the sample data loaded on first run.
   Stop ids are global: the same bar keeps the same id in every map/version,
   so visit counts carry across. `k` = extra names used to find the stop in OpenStreetMap.
   side: "L" / "R" (only used when the map has `sides`); off: true = off the main route (dotted). */

const BASE_MAPS = [
{
  id:"bermondsey", name:"Bermondsey Beer Mile", short:"Bermondsey", city:"London SE1/SE16",
  bbox:[51.4930,-0.0800,51.5025,-0.0650],
  sides:{L:{name:"Druid St side",sub:"North of the railway"},R:{name:"Enid St side",sub:"South of the railway"}},
  termini:{a:{name:"London Bridge",sub:"Tube & rail"},b:{name:"Bermondsey",sub:"Jubilee line · short walk from the Kernel"}},
  offLabel:"Off the arches", crossLabel:"Cross under the railway",
  stops:[
    {id:"southwark",n:"Southwark Brewing Co",a:"46 Druid St, SE1 2EZ",side:"L",prio:true,k:["Southwark Brewing"],
      note:"The pick of the mile for fresh cask ale. Small inside, plenty of standing room out front."},
    {id:"kanpai",n:"Kanpai Sake",a:"48 Druid St, SE1 2EZ",side:"L",prio:true,k:["Kanpai"],
      note:"London-brewed craft sake. Get a flight; staff will tell you what order to drink them in."},
    {id:"doodle",n:"The Doodle Bar",a:"60 Druid St, SE1 2EZ",side:"L",k:["Doodle Bar"],
      note:"A bar rather than a brewery. Chalk walls, ping pong, burgers. Useful for food."},
    {id:"barrel",n:"The Barrel Project",a:"80 Druid St, SE1 2HQ",side:"L",k:["Barrel Project","London Beer Factory"],
      note:"London Beer Factory's taproom: big, busy and barrel-lined. Pours from ⅓ to a pint, burgers on site."},
    {id:"fabal",n:"Fabal Beerhall",a:"88 Druid St, SE1 2AN",side:"L",k:["Fabal"],
      note:"Roomy beerhall with plenty of seating, DJs some nights and a quiz. Good when everywhere else is rammed."},
    {id:"thesedays",n:"These Days",a:"100 Druid St, SE1 2HQ",side:"L",k:["These Days"],
      note:"Cocktail bar and kitchen rather than a brewery. A change of pace mid-crawl."},
    {id:"billy",n:"Billy Franks",a:"104 Druid St, SE1 2HQ",side:"L",k:["Billy Franks"],
      note:"Craft beer and jerky shack, Saturdays only. Not many taps, but the fridge of sours is worth a look."},
    {id:"lcr",n:"London City Runners",a:"Druid St, SE1 2HH",side:"L",k:["London City Runners"],
      note:"A running club's bar. Friendly crowd, ping pong, cheap."},
    {id:"anspach",n:"Anspach & Hobday",a:"118 Druid St, SE1 2HH",side:"L",k:["Anspach","Arch House"],
      note:"Home of London Black, their signature porter, and known for its bitters. Friendly staff who'll give you tasters."},
    {id:"hiver",n:"Hiver Taproom",a:"56 Stanworth St, SE1 3NY",side:"R",prio:true,k:["Hiver"],
      note:"Honey beers, with live music some days. Couldn't get in last time, so worth another go."},
    {id:"dutch",n:"It Ain't Much If It Ain't Dutch",a:"67–68 Enid St, SE16 3RD",side:"R",k:["Ain't Dutch","Dutch Taproom"],
      note:"Around 30 taps of Dutch beer, traditional and craft. Order the bitterballen."},
    {id:"moor",n:"Moor Beer Vaults",a:"71 Enid St, SE16 3RA",side:"R",prio:true,k:["Moor"],
      note:"London taproom of a Bristol brewery, and they serve ¾ pints. It's next door to Blue Monk."},
    {id:"bluemonk",n:"The Blue Monk",a:"71 Enid St, SE16 3RA",side:"R",k:["Blue Monk"],
      note:"Bar with a big back room for live music, comedy and karaoke. Pizza from next door to your table."},
    {id:"bighug",n:"Big Hug Social",a:"Arch 72 Enid St, SE16 3RA",side:"R",prio:true,k:["Big Hug"],
      note:"Social-cause beers at good prices. Part of the Gosnells cluster."},
    {id:"gosnells",n:"Gosnells",a:"72 Enid St, SE16 3RA",side:"R",k:["Gosnells"],
      note:"Mead taproom: light, fruity, honey-based drinks, plus a fridge of other breweries' cans."},
    {id:"cloudwater",n:"Cloudwater",a:"73 Enid St, SE16 3RA",side:"R",k:["Cloudwater"],
      note:"London taproom of the Manchester brewery, pouring cask and keg. The pretzel bites are addictive."},
    {id:"atg",n:"Against the Grain Cidery",a:"76 Enid St, SE16 3RA",side:"R",k:["Against the Grain"],
      note:"Cider made on site. Hot mulled cider in winter; try Midnight Oil, a cold-brew coffee cider."},
    {id:"bianca",n:"Bianca Road Brew Co",a:"82–84 Enid St, SE16 3RA",side:"R",k:["Bianca Road"],
      note:"Home of Sweet Tooth, your best-rated drink last time. Sometimes teams up with the Chinese kitchen next door."},
    {id:"cbj",n:"Craft Beer Junction",a:"86 Enid St, SE16 3RD",side:"R",k:["Craft Beer Junction"],
      note:"Bottle shop and bar with beers from all over the world. Tell the staff what you like and they'll pick for you."},
    {id:"enidtavern",n:"Enid Street Tavern",a:"87 Enid St, SE16 3RA",side:"R",k:["Enid Street Tavern"],
      note:"Small craft bar with a good tap list, often including DEYA. Storytelling nights on Thursdays."},
    {id:"mashpaddle",n:"Mash Paddle",a:"92 Enid St, SE16 3RD",side:"R",k:["Mash Paddle"],
      note:"Brewery taproom where a paddle of three ⅓ pints is the way to go. Usually a pizza van outside."},
    {id:"kernel",n:"The Kernel",a:"132 Spa Rd, SE16 3AE",side:"R",off:true,k:["Kernel"],
      note:"Where the whole mile started (2009). Rotating beers plus excellent Japanese izakaya food."}
  ]
},
{
  id:"blackhorse", name:"Blackhorse Beer Mile", short:"Blackhorse", city:"Walthamstow E17",
  bbox:[51.5830,-0.0520,51.5960,-0.0300],
  sides:null,
  termini:{a:{name:"Blackhorse Road",sub:"Victoria line & Overground"},b:null},
  stops:[
    {id:"bh-bigpenny",n:"Big Penny Social",a:"1 Priestley Way, E17 6AL",k:["Big Penny","Truman"],prio:true,
      note:"The biggest venue on the mile: a huge beer hall with dozens of taps, a big terrace, and events most weekends."},
    {id:"bh-signature",n:"Signature Brew",a:"Unit 15, Uplands Business Park, E17 5QJ",k:["Signature Brew","Signature"],
      note:"Music-themed brewery with a big covered bar among the brewing vats. Try the coffee porter."},
    {id:"bh-prettydecent",n:"Pretty Decent Beer Co",a:"Unit 10, Uplands Business Park, E17 5QJ",k:["Pretty Decent"],
      note:"Newest on the mile: a bright warehouse taproom with around 14 taps."},
    {id:"bh-exale",n:"Exale",a:"Unit 2C, Uplands Business Park, E17 5QJ",k:["Exale"],
      note:"More experimental beers in a quirky furniture-warehouse taproom. Krankie, their Irn-Bru sour, is a talking point."},
    {id:"bh-beerblefish",n:"Beerblefish",a:"Unit 2A-4, Uplands Business Park, E17 5QJ",k:["Beerblefish"],
      note:"Real ale specialists with a bright purple pool table and lots of artwork."},
    {id:"bh-hackney",n:"Hackney Brewery High Hill Taproom",a:"10 Lockwood Way, E17 5QQ",k:["Hackney Brewery","High Hill"],
      note:"Around 20 taps of their own beers plus guests. One of London's longest-running craft breweries."},
    {id:"bh-wildcard",n:"Wild Card Brewery",a:"Unit 2, Lockwood Way, E17 5RB",k:["Wild Card","Wildcard"],
      note:"Known for its IPA and pale ale. Picnic tables and guest food stalls at weekends."}
  ],
  nearby:"Walthamstow"
},
{
  id:"tottenham", name:"Tottenham Hale", short:"Tottenham", city:"Tottenham N17",
  bbox:[51.5820,-0.0760,51.6100,-0.0450],
  sides:null,
  termini:{a:{name:"Tottenham Hale",sub:"Victoria line & rail"},b:{name:"Northumberland Park",sub:"Rail"}},
  stops:[
    {id:"th-motherkellys",n:"Mother Kelly's Tottenham",a:"Tottenham Hale, N17",k:["Mother Kelly"],
      note:"Craft beer bar from the Mother Kelly's group, close to the station. Check opening hours before going."},
    {id:"th-pressuredrop",n:"Pressure Drop",a:"Unit 6, Lockwood Industrial Park, Mill Mead Rd, N17 9QP",k:["Pressure Drop"],prio:true,
      note:"The big one here: a large taproom among the tanks with around 10 of their own beers. Fridays and Saturdays, often with a food stall."},
    {id:"th-beavertown",n:"Beavertown (Tottenham)",a:"Units 17 & 18, Lockwood Industrial Park, N17 9QP",k:["Beavertown"],
      note:"Beavertown's original Tottenham tap. Reported closed long-term in 2024 after the move to Enfield, so check before going."},
    {id:"th-bohem",n:"Bohem Brewery",a:"Unit 5, Littleline House, 41-43 West Rd, N17 0RE",k:["Bohem"],
      note:"Traditional Czech-style lagers poured properly. Further north, near Northumberland Park."},
    {id:"th-redemption",n:"Redemption Brewery",a:"16 Compass West Estate, West Rd, N17 0XL",k:["Redemption"],
      note:"Cask ale specialists. The tap only opens on Spurs home match days."}
  ]
},
{
  id:"hackneywick", name:"Hackney Wick", short:"Hackney Wick", city:"Hackney Wick E9",
  bbox:[51.5380,-0.0350,51.5500,-0.0150],
  sides:null,
  termini:{a:{name:"Hackney Wick",sub:"Overground"},b:null},
  stops:[
    {id:"hw-beermerchants",n:"Beer Merchants Tap",a:"99 Wallis Rd, E9 5LN",k:["Beer Merchants"],prio:true,
      note:"Huge range: 20 taps, a couple of casks and hundreds of cans and bottles, plus food."},
    {id:"hw-oldstreet",n:"Old Street Brewery",a:"Unit 1, Queen's Yard, E9 5EN",k:["Old Street Brewery"],
      note:"Comic-book-themed brewery bar with around 10 taps and a food stand. Check it's still open before going."},
    {id:"hw-crate",n:"Crate Brewery",a:"Unit 7, Queen's Yard, E9 5EN",k:["Crate"],
      note:"Brewery and pizzeria with a popular canalside terrace. Get a pizza with your pint."},
    {id:"hw-howlinghops",n:"Howling Hops Tank Bar",a:"Unit 9A, Queen's Yard, White Post Ln, E9 5EN",k:["Howling Hops"],prio:true,
      note:"The UK's first tank bar: beer poured straight from the tanks behind the bar. Weekend DJs."}
  ]
},
{
  id:"manchester", name:"Manchester Piccadilly", short:"Manchester", city:"Manchester M1",
  bbox:[53.4720,-2.2400,53.4840,-2.2180],
  sides:null,
  termini:{a:{name:"Manchester Piccadilly",sub:"Rail & Metrolink"},b:null},
  stops:[
    {id:"mc-sureshot",n:"Sureshot Taproom",a:"Sheffield St arches, M1",k:["Sureshot"],prio:true,
      note:"Railway-arch taproom under Piccadilly station. Click-and-collect pizza, DJs and live sport."},
    {id:"mc-balance",n:"Balance Brewing & Blending",a:"10 Sheffield St, M1",k:["Balance"],
      note:"Mixed-culture, barrel-fermented beers in a beautiful arch. Keg only, lots of sours and aged beers."},
    {id:"mc-cloudwater",n:"Cloudwater Unit 9",a:"Unit 9, Piccadilly Trading Estate, M1 2NP",k:["Cloudwater"],
      note:"Cloudwater's home taproom with 20 taps, all poured from the cold store. Some barrel-aged beers."},
    {id:"mc-track",n:"Track Brewery Tap",a:"Unit 18, Piccadilly Trading Estate, M1 2NP",k:["Track"],prio:true,
      note:"Big taproom right next to the brewery, with around 20 keg lines and a few casks. Across the road from Cloudwater."}
  ]
}
];

/* Sample data loaded on a phone with nothing saved yet: the 7 March 2026 trip. */
const SEED = {"version": 1, "roster": {"JL": "Josh", "DD": "Dan D", "DC": "Dan C"}, "variants": [], "trips": [{"id": "2026-03-07", "date": "2026-03-07", "name": "", "players": ["JL", "DD", "DC"], "status": "done", "mapId": "bermondsey", "mapName": "Bermondsey Beer Mile", "start": "b", "created": 1772870400000, "visits": [{"v": "kernel", "status": "visited", "drinks": [{"by": ["JL"], "name": "Destination IPA", "score": 6.5}, {"by": ["DD"], "name": "Raspberry Saison", "note": "It was a grower", "score": 7}, {"by": ["DC"], "name": "Apricot Saison", "score": 6.5}]}, {"v": "mashpaddle", "status": "visited", "note": "We each got a paddle of three ⅓ pints", "drinks": [{"by": ["JL"], "name": "Glasgow Breakfast", "note": "Stout", "score": 5.5}, {"by": ["JL"], "name": "Pins & Needles", "score": 5}, {"by": ["JL"], "name": "Carousel", "note": "Toffee apple cider", "score": 7.5}, {"by": ["DD"], "name": "Glasgow Breakfast", "note": "Stout", "score": 6}, {"by": ["DD"], "name": "Carousel", "note": "Sweet but flat", "score": 6}, {"by": ["DD"], "name": "Dubble Trubble", "note": "Wheat beer", "score": 5}, {"by": ["DC"], "name": "Glasgow Breakfast", "note": "Stout. Initial flavour good, no aftertaste", "score": 6}, {"by": ["DC"], "name": "Ninkasi", "note": "Nice, run of the mill IPA", "score": 7}, {"by": ["DC"], "name": "Power Surge", "score": 7.5}]}, {"v": "enidtavern", "status": "visited", "drinks": [{"by": ["DD"], "name": "Enid Street Tavern Lager", "score": 7}, {"by": ["DC"], "name": "I Heart Sour", "score": 8}, {"by": ["JL"], "name": "I Could Get Better at T*sco for a Quid", "score": 6.5}]}, {"v": "cbj", "status": "visited", "drinks": [{"by": ["JL"], "name": "Burner Phone", "note": "Hazy DIPA", "score": 7.5}, {"by": ["DD"], "name": "Passionfruit & Nectarine Sorbet", "score": 5}, {"by": ["DD"], "name": "Cherry Cheesecake Sour", "score": 6}, {"by": ["DC"], "name": "Passionfruit & Nectarine Sorbet", "score": 5}, {"by": ["DC"], "name": "Cherry Cheesecake Sour", "score": 6}]}, {"v": "bianca", "status": "visited", "drinks": [{"by": ["JL"], "name": "Cracked Summer", "note": "Lemon & black pepper", "score": 6.5}, {"by": ["JL"], "name": "Sweet Tooth", "note": "Stout", "score": 9}, {"by": ["DD"], "name": "Sweet Tooth", "note": "Stout", "score": 8.5}, {"by": ["DC"], "name": "Coffee Porter", "score": 7}, {"by": ["DC"], "name": "Sweet Tooth", "note": "Stout", "score": 8.5}]}, {"v": "atg", "status": "visited", "drinks": [{"by": ["JL"], "name": "Hot Mulled Cider", "score": 7}, {"by": ["DC"], "name": "Hot Mulled Cider", "score": 6}, {"by": ["DD"], "name": "Mirror Mirror", "score": 6.5}]}, {"v": "cloudwater", "status": "visited", "drinks": [{"by": ["JL"], "name": "The Joy of Living", "score": 5}, {"by": ["DC"], "name": "Terry's Chocolate Orange", "score": 4.5}, {"by": ["DD"], "name": "Terry's Chocolate Orange", "score": 3.5}]}, {"v": "gosnells", "status": "visited", "drinks": [{"by": ["JL"], "name": "Honey & Ginger", "score": 8}, {"by": ["DC"], "name": "Blueberry Velvet", "score": 7.5}, {"by": ["DD"], "name": "Raspberry & Hibiscus", "score": 7.5}]}, {"v": "bluemonk", "status": "visited", "drinks": [{"by": ["JL"], "name": "Deya Machine Cover", "score": 7}, {"by": ["DC"], "name": "Burnt Mill Beyond the Firs", "score": 7.5}, {"by": ["DD"], "name": "Asahi", "score": 7}]}, {"v": "dutch", "status": "visited", "drinks": [{"by": ["JL"], "name": "13 DIEPA", "score": 6.5}, {"by": ["DD"], "name": "30 Blueberry Vanilla Chocolate Muffin", "score": 6}, {"by": ["DC"], "name": "30 Blueberry Vanilla Chocolate Muffin", "score": 6.5}]}, {"v": "anspach", "status": "visited", "drinks": [{"by": ["JL"], "name": "Turn the Hifi Down", "note": "Nitro red ale", "score": 6.5}, {"by": ["DC"], "name": "Yule Law Brown Ale", "note": "Christmas edition", "score": 7.5}, {"by": ["DD"], "name": "Ansbacher Premium Helles Lager", "score": 6}]}, {"v": "hiver", "status": "noentry", "drinks": []}, {"v": "thesedays", "status": "visited", "drinks": [{"by": ["JL"], "name": "Guinness", "score": 7}, {"by": ["DD"], "name": "Guinness", "score": 7}, {"by": ["DC"], "name": "Guinness", "note": "Recognised as Fulhamish presenter", "score": 7}]}, {"v": "fabal", "status": "visited", "drinks": [{"by": ["JL"], "name": "Siren Brown Ale", "score": 6}, {"by": ["DD"], "name": "Mad Squirrel Nitro Dry Stout", "score": 6}, {"by": ["DC"], "name": "Mad Squirrel Nitro Dry Stout", "score": 6.5}]}, {"v": "barrel", "status": "visited", "drinks": [{"by": ["JL"], "name": "Jungle Trip", "score": 6.5}, {"by": ["DD"], "name": "Peanut Butter Stout", "score": 8.5}, {"by": ["DC"], "name": "City of Cake", "score": 7.5}]}]}]};
