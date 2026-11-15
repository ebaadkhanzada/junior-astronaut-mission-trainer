/* Game data. Edit this file to tune difficulty, add real storm events or change facts.
   Loaded before sim.js. No game logic here. */
const DATA=(function(){
const SITES={
  moon:{key:'moon',name:'The Moon',short:'Moon',place:'Shackleton Crater rim, near the south pole',gcr:1.37,sun:.9,budgetMul:1,hop:1.7,delay:'1.3 seconds',
    blurb:'Strongest everyday radiation of the two. Quick radio replies.',lander:'Lunar lander'},
  mars:{key:'mars',name:'Mars',short:'Mars',place:'Jezero Crater',gcr:.64,sun:.84,budgetMul:.75,hop:.9,delay:'3 to 22 minutes',
    blurb:'Gentler everyday radiation, weaker sunlight, dust storms, and warnings that arrive late.',lander:'Mars lander'}
};
const MODES={
  easy:{key:'easy',name:'Easy',rank:'Cadet',days:5,dayLen:60,daylight:.72,sci:5,harv:2,exer:0,budget:15,storms:[1,2],lead:26,cons:.72,breath:.75,suit:1.5,
    foodDrain:.28,dust:.0016,filterWear:.18,fitDrain:0,rockMin:260,rockMax:560,failures:0,dustStorm:false,grow:30,yield:34,battery0:90,cap:100,suitNeed:40,
    blurb:'5 days, 2 small storms, long warnings and a guided first day.'},
  medium:{key:'medium',name:'Medium',rank:'Pilot',days:7,dayLen:60,daylight:.65,sci:8,harv:3,exer:2,budget:16,storms:[1,2,2],lead:16,cons:1.08,breath:.9,suit:2,
    foodDrain:.34,dust:.0028,filterWear:.3,fitDrain:.3,rockMin:340,rockMax:800,failures:1,dustStorm:false,grow:36,yield:32,battery0:80,cap:100,suitNeed:50,
    blurb:'7 days, 3 storms, shorter warnings, breakdowns and crew fitness to manage.'},
  hard:{key:'hard',name:'Hard',rank:'Commander',days:9,dayLen:60,daylight:.62,sci:11,harv:4,exer:3,budget:16,storms:[2,2,3,3],lead:9,cons:1,breath:1,suit:2.3,
    foodDrain:.38,dust:.0038,filterWear:.4,fitDrain:.4,rockMin:450,rockMax:1000,failures:3,dustStorm:true,grow:40,yield:32,battery0:70,cap:100,suitNeed:60,
    blurb:'9 days, 4 big storms with almost no warning, constant breakdowns, power always short.'}
};
/* Real events. Class is as first reported. status: v = checked against SpaceWeatherLive top-50 lists; gle = date confirmed in published papers; news = confirmed in NASA/press reports. */
const ARCHIVE=[
 {id:'a-2017-09-06',date:'6 Sep 2017',cls:'X9.3',region:'AR 2673',sev:3,speed:'fast',status:'v',title:'The biggest flare of Solar Cycle 24',blurb:'A giant sunspot called AR 2673 let out an X9.3 flare. X is the strongest flare class.'},
 {id:'a-2017-09-10',date:'10 Sep 2017',cls:'X8.2',region:'AR 2673',sev:3,speed:'fast',status:'v',title:'The flare that reached Mars',blurb:'The same sunspot fired again. Its particles travelled across the solar system.',
   fact:{mars:'A day later NASA’s Curiosity rover and MAVEN orbiter felt it. Radiation on the Martian surface doubled (NASA JPL).',moon:'It was strong enough that detectors on the ground on Earth noticed it too, which is rare (a ground level enhancement).'}},
 {id:'a-2024-10-03',date:'3 Oct 2024',cls:'X9.0',region:'AR 3842',sev:3,speed:'fast',status:'v',title:'The strongest flare of Solar Cycle 25 when it happened',blurb:'NASA’s Solar Dynamics Observatory watched an X9.0 flare burst from the Sun.'},
 {id:'a-2011-08-09',date:'9 Aug 2011',cls:'X6.9',region:'AR 1263',sev:3,speed:'fast',status:'v',title:'A big flare from the last cycle',blurb:'An X6.9 flare from sunspot region 1263.'},
 {id:'a-2012-07-23',date:'23 Jul 2012',cls:'CME',region:'STEREO-A',sev:3,speed:'slow',status:'news',title:'The superstorm that missed Earth',blurb:'A monster cloud of Sun-stuff (a CME) raced past Earth’s orbit and hit NASA’s STEREO-A spacecraft instead. A week earlier it would have hit us.'},
 {id:'a-2024-05-11',date:'11 May 2024',cls:'X5.8',region:'AR 3664',sev:3,speed:'slow',status:'v',title:'The storm that lit the sky',blurb:'A very active sunspot fired several X flares in a row.'},
 {id:'a-2014-02-25',date:'25 Feb 2014',cls:'X4.9',region:'AR 1990',sev:2,speed:'fast',status:'v',title:'A strong X-class flare',blurb:'An X4.9 flare from a big sunspot group.'},
 {id:'a-2021-10-28',date:'28 Oct 2021',cls:'X1.0',region:'AR 2887',sev:2,speed:'fast',status:'gle',title:'A flare with very fast particles',blurb:'An X1.0 flare. It was the first of its kind in Solar Cycle 25 to be noticed by ground detectors on Earth.'},
 {id:'a-2023-12-14',date:'14 Dec 2023',cls:'X2.8',region:'AR 3514',sev:2,speed:'slow',status:'v',title:'A strong flare in a busy year',blurb:'An X2.8 flare as the Sun climbed toward its busiest time.'},
 {id:'a-2012-03-07',date:'7 Mar 2012',cls:'X5.4',region:'AR 1429',sev:2,speed:'slow',status:'v',title:'A double flare day',blurb:'An X5.4 flare, with a second X-class flare the same day.'}
];
const GENERIC=[
 {id:'g-1',date:null,cls:'M-class',region:'a sunspot',sev:1,speed:'slow',typical:true,title:'A medium flare',blurb:'M-class flares are medium-sized. DONKI logs lots of them when the Sun is busy.'},
 {id:'g-2',date:null,cls:'M-class',region:'a sunspot',sev:1,speed:'fast',typical:true,title:'A quick medium flare',blurb:'Some medium flares send particles very fast.'},
 {id:'g-3',date:null,cls:'M-class',region:'a sunspot',sev:1,speed:'slow',typical:true,title:'Another medium flare',blurb:'Not every storm is a monster. Small ones add up.'}
];
const TIPS=[
 {t:'On the Moon’s surface China’s Chang’e 4 lander measured about 1.37 mSv of radiation a day. That is about 2.6 times what the space station gets from cosmic rays.',src:'Chang’e 4 lander report'},
 {t:'NASA’s Curiosity rover measured about 0.64 mSv a day on Mars, and about 1.84 mSv a day on the flight there.',src:'Curiosity RAD instrument'},
 {t:'Mice flown to the space station lost muscle and bone. A treatment targeting myostatin and activin A protected them. That is one reason astronauts exercise.',src:'NASA OSDR, study OSD-342'},
 {t:'Growing food in space can relate to the health and nutrition of astronauts.',src:'Canadian Space Agency, food production toolkit'},
 {t:'Thick walls stop solar storm particles well but stop galactic cosmic rays much less. That is why your cellar helps a lot in storms and only a little on quiet days.',src:'Game model, simplified'},
 {t:'Solar panels collect dust on the Moon and Mars, so crews must clean them or lose power.',src:'Mission planning basics'}
];

return{SITES,MODES,ARCHIVE,GENERIC,TIPS};
})();
