import { TIME_PERIODS } from './activities.js'

export const DIALOGUES = {
  jon: {
    [TIME_PERIODS.DAY]: [
      {
        opening: 'I moved the dock speaker THREE centimetres to the left. The bass hits different now. Science.',
        responses: {
          nice:        'You know what, I can actually hear the difference. Respect.',
          neutral:     'Sure. Three centimetres. Sure.',
          provocative: "It's a Bluetooth speaker at a lake cottage. You need to calm down.",
        },
        reactions: {
          nice:        "EXACTLY. Thank you. I've been trying to explain this to everyone since breakfast.",
          neutral:     'Your lack of enthusiasm is noted and catalogued.',
          provocative: "I have a decibel meter. And a tape measure. Don't start this.",
        },
      },
      {
        opening: 'Nikkebre has been in the sauna since 8am. The acoustics in there are wasted on him.',
        responses: {
          nice:        "You should set up some speakers in there. Sauna concert vibes.",
          neutral:     'He seems to be doing fine in there.',
          provocative: "Maybe the man just wants to sweat in peace without a soundtrack.",
        },
        reactions: {
          nice:        "I HAVE CONSIDERED THIS. Moisture-resistant drivers. I know a guy.",
          neutral:     'Fine is a low bar. The sauna deserves ambition.',
          provocative: "Peace is not the point. Sound is the point. The point is sound.",
        },
      },
      {
        opening: "WHO REARRANGED THE GRILL? The speaker placement was calibrated for THIS exact grill position.",
        responses: {
          nice:        "I'll help you recalibrate. What's the reference point?",
          neutral:     'I think Edu moved it to get better light for a photo.',
          provocative: "Jon. Buddy. The grill position does not affect speaker sound.",
        },
        reactions: {
          nice:        "Thank you. Okay. Southeast corner, 1.4 metres from the railing. Help me measure.",
          neutral:     "EDU. EDU I NEED TO TALK TO YOU ABOUT SPATIAL AWARENESS.",
          provocative: "The reflection off the grill lid creates a 3-degree soundwave deflection. Do your research.",
        },
      },
      {
        opening: "I built a 4-hour mölkky finals set. Edu said it was 'a lot'. It is exactly the right amount.",
        responses: {
          nice:        'Four hours for mölkky finals sounds completely appropriate to me.',
          neutral:     'Four hours is... ambitious for a lawn game.',
          provocative: "Nobody is playing mölkky for four hours, Jon.",
        },
        reactions: {
          nice:        "THANK YOU. You're the only person here with correct opinions about music and sport.",
          neutral:     "It's not ambition. It's respect for the game. And the vibe.",
          provocative: "They will. The set has an arc. You don't just stop mid-arc.",
        },
      },
    ],
    [TIME_PERIODS.EVENING]: [
      {
        opening: 'Fire is lit, dock speaker is running at 73% volume. The night is technically perfect.',
        responses: {
          nice:        'It really is. This exact moment is exactly what summer should be.',
          neutral:     'Why 73 specifically?',
          provocative: "Why not 100%? Commit to the vibe.",
        },
        reactions: {
          nice:        "*nods slowly* Yeah. I know. I know it is.",
          neutral:     '73 is the sweet spot. Above that the high mids get harsh over water.',
          provocative: "100 clips the mid-range. 73 is science. I don't expect everyone to understand.",
        },
      },
      {
        opening: "I made a golden hour playlist — 47 minutes of pure vibes. Schmaxel said it was 'fine'. Fine.",
        responses: {
          nice:        "47 minutes is perfect. I'll listen to the whole thing.",
          neutral:     "I mean, 'fine' is not bad.",
          provocative: "Schmaxel's right. It's fine. Chill.",
        },
        reactions: {
          nice:        "*points at you* That person. Right there. Ears of gold.",
          neutral:     "'Fine' is the worst thing you can say about art. It means nothing. It is silence.",
          provocative: "I don't need this from two people today. The playlist has feelings.",
        },
      },
      {
        opening: 'The palju bubbles are syncing up with the bass. This is not a coincidence. This is ART.',
        responses: {
          nice:        "That's... actually kind of beautiful. You made that happen?",
          neutral:     'I think that might be a coincidence.',
          provocative: "Jon. The hot tub runs on a pump. It does not sync to music.",
        },
        reactions: {
          nice:        "I didn't make it happen. I *allowed* it to happen. Big difference.",
          neutral:     'I timed the track changes to the bubble cycle. Not a coincidence.',
          provocative: "*turns up bass slightly* The pump is starting to understand.",
        },
      },
      {
        opening: "Elliot tried to request something. I said yes. I did not play it. The set is sacred.",
        responses: {
          nice:        'The set integrity must be protected. Respect.',
          neutral:     'That seems a little harsh on Elliot.',
          provocative: "Just play the man's song, Jon.",
        },
        reactions: {
          nice:        "Finally. Someone who understands curation. Elliot will recover.",
          neutral:     'Elliot requested \'Sandstorm\'. In 2025. At a lake. I made a judgment call.',
          provocative: "It was Sandstorm. I will not play Sandstorm. This is a hill I will die on.",
        },
      },
    ],
    [TIME_PERIODS.NIGHT]: [
      {
        opening: "*DJ HORN* THE MÖKKI PARTY IS NOW OFFICIALLY IN SESSION. TELL THE LAKE.",
        responses: {
          nice:        'THE LAKE HAS BEEN INFORMED. WE ARE DOING THIS.',
          neutral:     'It is quite late for this level of announcement.',
          provocative: 'Jon, it is midnight. There are people sleeping across the water.',
        },
        reactions: {
          nice:        "YESSS. Okay. You. You are my person for the rest of this night.",
          neutral:     'It is never too late for a proper opening ceremony. This is tradition.',
          provocative: "The lake absorbs sound differently at night. It carries it FURTHER. It's a feature.",
        },
      },
      {
        opening: "Immobile wanted a 'workout playlist'. I said no. The dock is not a gym. This is consecrated ground.",
        responses: {
          nice:        'Absolutely. The dock is for vibes, not reps.',
          neutral:     "I mean, he could just listen to your playlist while working out.",
          provocative: "Just make him a workout playlist. It takes five minutes.",
        },
        reactions: {
          nice:        "Thank you. The dock has a vibe taxonomy. Gym is not a category.",
          neutral:     "He wanted 'pump-up bangers'. That's not what this dock represents.",
          provocative: "He asked for a BPM range. A BPM RANGE. Like music is... fitness data.",
        },
      },
      {
        opening: "Someone tell Schmaxel to stop leaning on the speaker like it's a fashion prop and DANCE.",
        responses: {
          nice:        "SCHMAXEL. DANCE. IT IS A COMMAND FROM THE DJ.",
          neutral:     'Schmaxel looks like he is almost dancing. Kind of.',
          provocative: "Schmaxel is vibing in his own way. Let the man lean.",
        },
        reactions: {
          nice:        "THANK YOU. Finally some backup. Schmaxel! Did you hear that?",
          neutral:     "Schmaxel's 'almost dancing' is a threat to the energy of this entire dock.",
          provocative: "Leaning is not vibing. Leaning is load-bearing. My speaker is not structural.",
        },
      },
    ],
    [TIME_PERIODS.LATE_NIGHT]: [
      {
        opening: 'One more song. Just one. I said that four songs ago. The arithmetic is not mattering right now.',
        responses: {
          nice:        'One more. Absolutely. Play it. We are not stopping.',
          neutral:     'It is 2am, Jon. At some point the math has to matter.',
          provocative: 'Jon. Go to sleep. The dock will be here tomorrow.',
        },
        reactions: {
          nice:        "*wipes tear* You are a real one. Okay. One more. This one's for you.",
          neutral:     'Time is a construct. Music is not. The music wins.',
          provocative: "I cannot sleep when there are songs that haven't been played yet. It's a moral issue.",
        },
      },
      {
        opening: "Mark said it's 2am. Mark has a spreadsheet about it. I told him to put the spreadsheet away.",
        responses: {
          nice:        'Mark and his spreadsheet can wait. Keep going.',
          neutral:     'Mark usually has a point though.',
          provocative: 'Honestly Mark and his spreadsheet are both correct.',
        },
        reactions: {
          nice:        "That's it. That's the right answer. The spreadsheet does not get a vote tonight.",
          neutral:     "Mark's point is time-based. Time is irrelevant after midnight on midsummer. It's law.",
          provocative: "Even if they're correct, correct isn't the vibe I'm going for right now.",
        },
      },
    ],
  },

  alwar: {
    [TIME_PERIODS.DAY]: [
      {
        opening: "SQUAWK! *eyeing the grill with the focus of a creature who has made life choices*",
        responses: {
          nice:        "*offers a small piece of bread* Here you go, little guy.',",
          neutral:     "*steps slightly to the left, out of direct eye contact*",
          provocative: "Don't even think about it. Those are OUR sausages.",
        },
        reactions: {
          nice:        "*accepts bread, immediately drops it, steals something else instead* SQUAWK.",
          neutral:     "*shuffles to the left to maintain eye contact* SQUAWK.",
          provocative: "*has already thought about it* SQUAWK. *thought about it more*",
        },
      },
      {
        opening: "*lands directly on the mölkky equipment* Mine now. Come get it.",
        responses: {
          nice:        "*slowly backs away, making no sudden movements*",
          neutral:     "That's... that's the mölkky set. We need that.",
          provocative: "*advances toward the mölkky set* That's not yours. Move.",
        },
        reactions: {
          nice:        "*remains on mölkky set, satisfied* SQUAWK.",
          neutral:     "SQUAWK. *shuffles further onto the mölkky set* More mine now.",
          provocative: "*flaps wings once, very deliberately* SQUAWK. Challenge acknowledged.",
        },
      },
      {
        opening: "*makes sustained eye contact while stealing a chip from your specific hand*",
        responses: {
          nice:        '*lets the chip go* Fair enough. You earned it with that stare.',
          neutral:     "*watches this happen with a look of complete resignation*",
          provocative: "*attempts to reclaim the chip* GIVE IT BACK.",
        },
        reactions: {
          nice:        "*eats chip without breaking eye contact* SQUAWK. More chip.",
          neutral:     "SQUAWK. *begins eyeing the rest of your snacks*",
          provocative: "SQUAWK! *chip is already gone* SQUAWK. *stares at next chip*",
        },
      },
    ],
    [TIME_PERIODS.EVENING]: [
      {
        opening: "SQUAAAWK! *plucks a bratwurst directly off the grill mid-cook, still sizzling*",
        responses: {
          nice:        "Impressive commitment. That bratwurst is yours now.",
          neutral:     'That... that was raw. That was a raw bratwurst.',
          provocative: "*immediately starts chasing* GIVE THAT BACK IT'S NOT COOKED.",
        },
        reactions: {
          nice:        "*takes bratwurst to the dock railing and begins attempting to eat it* SQUAWK.",
          neutral:     "SQUAWK. *does not care about food safety*",
          provocative: "SQUAWK! *runs with surprising speed toward the water*",
        },
      },
      {
        opening: "*drops a suspiciously damp pebble at your feet and stares expectantly*",
        responses: {
          nice:        '*crouches down and examines the pebble with genuine interest* Thank you.',
          neutral:     '*stares at the pebble, then back at Alwar*',
          provocative: "I don't know what this is but I don't want it.",
        },
        reactions: {
          nice:        "*waddles closer, drops another pebble* SQUAWK. More gift.",
          neutral:     "SQUAWK. *pushes pebble closer with beak* More examine.",
          provocative: "*picks up pebble, holds it, stares at you harder* SQUAWK.",
        },
      },
    ],
    [TIME_PERIODS.NIGHT]: [
      {
        opening: "*is awake. Has been awake this entire time. Is not tired.*",
        responses: {
          nice:        '*sits quietly nearby* Keeping watch together then.',
          neutral:     "It's midnight, Alwar. Birds sleep.",
          provocative: "Shouldn't you be on a nest or something? Go to sleep.",
        },
        reactions: {
          nice:        "*shifts closer* SQUAWK (quiet). *is still watching everything*",
          neutral:     "SQUAWK. *tilts head* Sleep is for those without territory to defend.",
          provocative: "SQUAWK. *stares into the middle distance* No.",
        },
      },
      {
        opening: "*lands on the dock railing, stares at the midnight sun, stares back at you* SQUAWK.",
        responses: {
          nice:        '*stands beside Alwar, looks at the midnight sun together*',
          neutral:     '*gives Alwar a polite nod and keeps walking*',
          provocative: "Stop being dramatic. It's just the sun.",
        },
        reactions: {
          nice:        "*does not squawk again for a long time* ...*squawk*",
          neutral:     "SQUAWK. *nods back, returns to sun contemplation*",
          provocative: "SQUAWK. *stares harder at sun* SQUAWK. *stares harder at you*",
        },
      },
    ],
    [TIME_PERIODS.LATE_NIGHT]: [
      {
        opening: "*asleep on the dock, one wing protectively over a stolen sausage* ...squawk.",
        responses: {
          nice:        '*gently places a blanket over Alwar* Rest well, little criminal.',
          neutral:     '*tries to quietly retrieve the sausage*',
          provocative: "*attempts to take the sausage back while Alwar sleeps*",
        },
        reactions: {
          nice:        "...squawk... *sleeps on, content*",
          neutral:     "*opens one eye* ...SQUAWK... *tightens wing grip on sausage*",
          provocative: "*eye opens immediately* SQUAWK! *sausage is now hidden under body*",
        },
      },
    ],
  },

  elliot: {
    [TIME_PERIODS.DAY]: [
      {
        opening: "What can I get you? I've been experimenting. Vodka, Karhu, palju water, one sprig of something. It's called 'The Nikkebre'.",
        responses: {
          nice:        "I'll try The Nikkebre. I trust the process.",
          neutral:     "What's the sprig of something?",
          provocative: "Palju water? You put palju water in a drink?",
        },
        reactions: {
          nice:        "*pours it* You're braver than most. Respect. Let me know if you feel anything unusual.",
          neutral:     "I genuinely don't know. It was green. It smelled like summer. I called it enough.",
          provocative: "*shrugs* It adds a mineral note. Nikkebre drinks it straight from the palju anyway so this is basically safer.",
        },
      },
      {
        opening: "The cooler is running low. Nobody has noticed yet. I'm running a social experiment.",
        responses: {
          nice:        "How long has the experiment been running? What are you observing?",
          neutral:     "Should you maybe just get more drinks?",
          provocative: "The experiment ends now. Where do we get more?",
        },
        reactions: {
          nice:        "Three hours. So far: nobody checks. They just hold an empty cup and keep talking. Fascinating.",
          neutral:     "In a bit. First I want to see how long it takes for someone to look.",
          provocative: "Robert brought emergency reserves in his car. He has not disclosed this to anyone. This is also data.",
        },
      },
      {
        opening: "I hid a six-pack under the dock boards. Emergency reserves. Alwar found one. He can't open it but he's trying.",
        responses: {
          nice:        "Smart. Emergency reserves are important. What's the emergency threshold?",
          neutral:     "Should you go help Alwar? Or help yourself to the others?",
          provocative: "The emergency reserves are already compromised. This is chaos.",
        },
        reactions: {
          nice:        "Emergency = Nixu issues a decree about drink rationing. Then the reserves open. Not before.",
          neutral:     "Alwar has been at it for 20 minutes. He's committed. I respect the commitment.",
          provocative: "One of five is compromised. Four remain. The system is resilient.",
        },
      },
    ],
    [TIME_PERIODS.EVENING]: [
      {
        opening: "Happy hour started at 5. It is now ongoing indefinitely. The concept of 'closing time' does not exist here.",
        responses: {
          nice:        "This is the correct policy. I fully endorse this.",
          neutral:     "Indefinitely is quite a commitment.",
          provocative: "You are going to run out of everything.",
        },
        reactions: {
          nice:        "*slides you a drink without being asked* Wise policy. I like you.",
          neutral:     "So is summer. Everything good is indefinite until it isn't.",
          provocative: "Robert's emergency car cache covers 3-4 more hours. After that: improvisation.",
        },
      },
      {
        opening: "Allu has had four drinks. He sincerely believes he's had one. I'm managing this with great care.",
        responses: {
          nice:        "You're doing important work. What's the care management protocol?",
          neutral:     "Is he okay though? Should someone check on him?",
          provocative: "Just tell him he's had four drinks.",
        },
        reactions: {
          nice:        "Water every third round, snacks every second, make him walk somewhere with a purpose. Classic.",
          neutral:     "He's fine. He's currently explaining his philosophy to the mölkky pins. They're handling it.",
          provocative: "I told him that. He said 'the first one doesn't count if you don't finish it'. He finished it.",
        },
      },
    ],
    [TIME_PERIODS.NIGHT]: [
      {
        opening: "Who opened the emergency sausage reserve? That was labelled. That was a sacred label.",
        responses: {
          nice:        "In fairness, it was getting very late and people were hungry.",
          neutral:     "I think it was Nixu. He issued a decree about it first.",
          provocative: "It was me. It was 11pm and the label was not that sacred.",
        },
        reactions: {
          nice:        "Hunger I understand. But the label said RESERVE. That means it's for a worse situation than this.",
          neutral:     "OF COURSE Nixu issued a decree. The decree makes it worse, not better.",
          provocative: "*long pause* ...How was the sausage?",
        },
      },
      {
        opening: "Robert just pitched a 'subscription cooler as a service' model to me. By the fire. At midnight. This is my life.",
        responses: {
          nice:        "What were the subscription tiers? Did he have a deck?",
          neutral:     "He pitches everywhere. You just learn to let it wash over you.",
          provocative: "You should have walked into the lake.",
        },
        reactions: {
          nice:        "Three tiers. He had slides. On his phone. At a bonfire. He had SLIDES.",
          neutral:     "He made me hold his phone while he used air quotes. At midnight. By a fire.",
          provocative: "I considered it. But the cooler is still my responsibility. The lake would not have helped.",
        },
      },
    ],
    [TIME_PERIODS.LATE_NIGHT]: [
      {
        opening: "Last call. I mean it this time. I really, genuinely mean it. Probably.",
        responses: {
          nice:        "One more then. For real this time.",
          neutral:     "You've said this a few times tonight.",
          provocative: "You don't mean it. None of us are going to sleep.",
        },
        reactions: {
          nice:        "*pours one more* This one's the last one. I'm not moving after this.",
          neutral:     "I know. Each time I say it I get slightly more serious. This is the most serious one.",
          provocative: "...okay fine. I don't mean it. But eventually someone will mean it and then we'll be in trouble.",
        },
      },
    ],
  },

  schmaxel: {
    [TIME_PERIODS.DAY]: [
      {
        opening: "*adjusts sunglasses*  Yeah I'd help haul firewood but I've got... something. You know. A thing.",
        responses: {
          nice:        "No worries, I'll get the firewood. You relax.",
          neutral:     "What's the thing?",
          provocative: "There's no thing. You just don't want to haul firewood.",
        },
        reactions: {
          nice:        "*points at you* Smart. Work smarter. That's the energy.",
          neutral:     "It's more of a... vibe. I'm conserving it. For later.",
          provocative: "The thing is energy conservation. And I'm very committed to it.",
        },
      },
      {
        opening: "I've found the perfect spot. Sun angle, distance from the speakers, optimal snack radius. Peak location science.",
        responses: {
          nice:        "That spot does look perfect. You've done the work.",
          neutral:     "How long did it take to find this spot?",
          provocative: "You have been lying there for three hours. That's not science. That's napping.",
        },
        reactions: {
          nice:        "*makes extremely small, satisfied gesture* Appreciate that.",
          neutral:     "About fifteen minutes of repositioning. Worth every second.",
          provocative: "Active recovery. Very different from napping. Napping has no system.",
        },
      },
      {
        opening: "I'm not lazy, I'm energy-conserving. Peak performance is about resource management.",
        responses: {
          nice:        "That's actually a really smart way to think about it.",
          neutral:     "Sure. Peak performance.",
          provocative: "You haven't moved in two hours.",
        },
        reactions: {
          nice:        "Finally. Someone who gets it. Immobile could learn from this.",
          neutral:     "*nods slowly* Correct.",
          provocative: "Exactly. Two hours of conservation banked. Ready to deploy.",
        },
      },
    ],
    [TIME_PERIODS.EVENING]: [
      {
        opening: "*leans against the dock speaker* This is the best spot at the mökki. Objectively.",
        responses: {
          nice:        "I have to agree. The light, the sound, the view. Ideal.",
          neutral:     "Jon is going to come tell you not to lean on the speaker.",
          provocative: "Jon is going to LOSE IT if he sees you using his speaker as a prop.",
        },
        reactions: {
          nice:        "*continues to lean, satisfied* Correct analysis.",
          neutral:     "He can say what he wants. The lean is load-bearing.",
          provocative: "*does not move* He can take it up with me. I'm structurally integrated now.",
        },
      },
      {
        opening: "Someone offered me mölkky and I said I was 'scouting the field'. I've been scouting for an hour.",
        responses: {
          nice:        "Deep scouting. Thorough. I respect the commitment to reconnaissance.",
          neutral:     "Are you going to play at any point?",
          provocative: "You're not scouting. You're avoiding mölkky.",
        },
        reactions: {
          nice:        "You can't rush good tactical analysis. The pins have patterns.",
          neutral:     "Possibly. I want to enter at the right moment.",
          provocative: "Mölkky is very energetic. I need to feel ready. I'm not ready.",
        },
      },
    ],
    [TIME_PERIODS.NIGHT]: [
      {
        opening: "I am technically still awake. This is more than I had planned.",
        responses: {
          nice:        "Staying up late is good. You're fully present.",
          neutral:     "What time did you plan to go to sleep?",
          provocative: "You look like you are 40% asleep right now.",
        },
        reactions: {
          nice:        "That's a positive way to frame it. I like that.",
          neutral:     "9pm was the original plan. The vibe extended the plan.",
          provocative: "That 40% is resting. The 60% is here and engaged.",
        },
      },
    ],
    [TIME_PERIODS.LATE_NIGHT]: [
      {
        opening: "I'm going to sleep in exactly... *pause* ...soon. Very soon.",
        responses: {
          nice:        "Take your time. The night is still young.",
          neutral:     "Soon meaning what, roughly?",
          provocative: "You said this an hour ago.",
        },
        reactions: {
          nice:        "Wise. No reason to rush departure from a good situation.",
          neutral:     "Soon is a flexible concept. I'll know it when I feel it.",
          provocative: "That hour was additional scouting. Of the sleeping situation.",
        },
      },
    ],
  },

  mark: {
    [TIME_PERIODS.DAY]: [
      {
        opening: "The lake current flows at approximately 0.3 knots northeast. I've mapped it. Mark out.",
        responses: {
          nice:        "That's incredible. How did you measure it?",
          neutral:     "Why did you map the lake current?",
          provocative: "You mapped a lake current. At a party. Why.",
        },
        reactions: {
          nice:        "Stick, timestamp, GPS. Old-school triangulation. Takes about 40 minutes if the weather cooperates.",
          neutral:     "Swimming safety. Also personal interest. Also there was a gap in the morning schedule.",
          provocative: "Data doesn't need a reason. Data exists. I record it. Mark out.",
        },
      },
      {
        opening: "Water temperature at the dock is 18.4 degrees. Good for swimming. Excellent for character building.",
        responses: {
          nice:        "18.4 is perfect. I'm going in. Join me?",
          neutral:     "How did you get an exact measurement?",
          provocative: "18.4 degrees is not good for swimming. It's good for screaming.",
        },
        reactions: {
          nice:        "I've already been in. 7am. 17.8 at that time. It rose 0.6 degrees by noon. Thermal dynamics.",
          neutral:     "Thermometer. In my kit. I bring it every year. People always ask that. Mark out.",
          provocative: "Brief screaming, then adaptation. That's the character building I mentioned.",
        },
      },
    ],
    [TIME_PERIODS.EVENING]: [
      {
        opening: "Sunset at 23:07 tonight. Documented. Also the fire reached optimal temperature at 20:42. Logged.",
        responses: {
          nice:        "Do you share this data anywhere? It seems useful to have.",
          neutral:     "You log the fire temperature?",
          provocative: "Mark. You cannot log a bonfire. It's a bonfire.",
        },
        reactions: {
          nice:        "I have a folder. Per year, per trip. Four years of data. Trends are emerging.",
          neutral:     "Infrared thermometer. Reads surface temp. Useful for cooking and documentation.",
          provocative: "I logged when it was lit, peak temp, fuel type, weather conditions. That's a log. Mark out.",
        },
      },
      {
        opening: "I've calculated that Allu has been philosophising for 47 minutes straight. New personal record.",
        responses: {
          nice:        "Is that the longest yet? What was the previous record?",
          neutral:     "You're timing Allu's philosophy sessions?",
          provocative: "Why are you tracking this?",
        },
        reactions: {
          nice:        "Previous record was 39 minutes, last midsummer, on the topic of whether mölkky is chess.",
          neutral:     "Since 2022. It started as a joke. Now it's longitudinal data. Mark out.",
          provocative: "Same reason I track everything. Patterns. Allu's philosophy episodes are accelerating. Concerning trend.",
        },
      },
    ],
    [TIME_PERIODS.NIGHT]: [
      {
        opening: "It is currently 01:14. I note this not as a complaint but as data.",
        responses: {
          nice:        "Noted. And logged?",
          neutral:     "Are you okay? Do you want to sleep?",
          provocative: "Go to sleep, Mark.",
        },
        reactions: {
          nice:        "Logged. Cross-referenced with ambient temperature and group energy. The data is interesting.",
          neutral:     "I'm fine. I sleep when the data says it's time. The data hasn't said yet.",
          provocative: "The data hasn't given the sleep signal. I don't override the data. Mark out.",
        },
      },
    ],
    [TIME_PERIODS.LATE_NIGHT]: [
      {
        opening: "02:38. Elliot has refilled his own drink four times without offering anyone else. Logged.",
        responses: {
          nice:        "Important data. What does the trend suggest?",
          neutral:     "Are you tracking everyone tonight?",
          provocative: "Mark. Stop logging people. It's a party.",
        },
        reactions: {
          nice:        "The trend suggests Elliot is rationing the good stuff. Investigation warranted.",
          neutral:     "Just the interesting variables. Elliot is a consistently interesting variable.",
          provocative: "The party is the data source. I'm not logging people. I'm logging events. Mark out.",
        },
      },
    ],
  },

  edu: {
    [TIME_PERIODS.DAY]: [
      {
        opening: "Schmaxel wore sandals with socks to the dock. I need you to understand how serious this situation is.",
        responses: {
          nice:        "I see it. I understand. This cannot stand.",
          neutral:     "I mean, sandals with socks isn't that bad at a mökki.",
          provocative: "Edu. They're sandals. At a lake. Nobody cares.",
        },
        reactions: {
          nice:        "Thank you. THANK YOU. Finally someone who gets the gravity here.",
          neutral:     "There's no 'not that bad' at a mökki. Standards don't take holidays.",
          provocative: "The lake cares. The dock cares. I care, which means aesthetics care.",
        },
      },
      {
        opening: "I've been trying to get a group photo for two hours. Everyone keeps moving, talking or doing something.",
        responses: {
          nice:        "Okay, I'll help you gather everyone. Give me five minutes.",
          neutral:     "People do tend to be active at parties.",
          provocative: "Maybe accept that the group photo isn't happening today.",
        },
        reactions: {
          nice:        "YES. Okay. You take the left flank, I'll take the right, we funnel them toward the dock.",
          neutral:     "Activity is the enemy of composition. I need stillness and golden light simultaneously.",
          provocative: "It's happening. I've waited too long to give up now. Sunk cost, but make it aesthetic.",
        },
      },
    ],
    [TIME_PERIODS.EVENING]: [
      {
        opening: "The golden hour light is perfect right now and NOBODY is in a photogenic position. This is a tragedy.",
        responses: {
          nice:        "I'll get into a photogenic position right now. Tell me where to stand.",
          neutral:     "What counts as a photogenic position?",
          provocative: "Edu. Take a photo of the lake. The lake is always in a good position.",
          },
        reactions: {
          nice:        "Okay — dock railing, three-quarter profile, sun on your left. Don't smile yet. Now smile. PERFECT.",
          neutral:     "Not leaning on a speaker. Not eating. Not explaining something with both hands. Just... being scenic.",
          provocative: "I have 40 photos of the lake. I need the PEOPLE. The people are the content.",
        },
      },
      {
        opening: "Robert just moved directly into the frame of every photo I was about to take. Three times.",
        responses: {
          nice:        "Put Robert IN the photo. Make him the subject.",
          neutral:     "Did you tell him he was in the frame?",
          provocative: "Robert does this everywhere. You have to be faster.",
        },
        reactions: {
          nice:        "...he would love that. He'd make it a LinkedIn post. I'm not doing that to the photo.",
          neutral:     "I did. He said he was 'adding dynamism'. He used the word dynamism. About himself.",
          provocative: "He's in motion at all times. It's like photographing a startup on legs.",
        },
      },
    ],
    [TIME_PERIODS.NIGHT]: [
      {
        opening: "The fire light is PERFECT for portraits and everyone has walked away from the fire to look at their phones. I'm devastated.",
        responses: {
          nice:        "I'll sit by the fire. Take my portrait. Go ahead.",
          neutral:     "The phone light isn't as bad as you think for portraits.",
          provocative: "Edu. Take photos of the fire. The fire doesn't walk away.",
        },
        reactions: {
          nice:        "*immediately raises phone* Don't move. Don't breathe yet. *click* That's the one.",
          neutral:     "Phone light is flat and cold and removes all soul from a face. I don't photograph souls.",
          provocative: "I have 60 fire photos. *shows phone* All excellent. Still not what I needed.",
        },
      },
    ],
    [TIME_PERIODS.LATE_NIGHT]: [
      {
        opening: "I have 340 photos from today. Two of them are good. That is a completely normal ratio.",
        responses: {
          nice:        "Two great photos from a day is genuinely a good outcome.",
          neutral:     "Which two?",
          provocative: "340 photos and only two good ones? That's rough.",
        },
        reactions: {
          nice:        "Thank you. One is Mark looking at data. One is Alwar stealing. Both candid. Both perfect.",
          neutral:     "*shows phone* Mark, 14:32, genuine confusion face. Alwar, 19:07, mid-theft focus. Art.",
          provocative: "Most photographers get one good shot per hundred. I'm at 0.6%. Above average.",
        },
      },
    ],
  },

  robert: {
    [TIME_PERIODS.DAY]: [
      {
        opening: "This whole mökki experience is fundamentally a PIVOT OPPORTUNITY. Airbnb for saunas. I'm calling it SaunaDAO.",
        responses: {
          nice:        "That's... actually not a terrible idea. Tell me more.",
          neutral:     "You came up with this at a lake party.",
          provocative: "Robert. You are at a mökki. Stop pitching.",
        },
        reactions: {
          nice:        "Okay so: decentralised sauna ownership, token-gated access, NFT towels. The whitepaper writes itself.",
          neutral:     "The best ideas come from direct user research. I'm the user. This is research.",
          provocative: "I pitch everywhere. The lake doesn't stop the hustle. The lake IS the hustle.",
        },
      },
      {
        opening: "I've identified three synergies between the mölkky game mechanics and Web3 tokenomics. Give me 90 seconds.",
        responses: {
          nice:        "Go. 90 seconds. I'm timing you.",
          neutral:     "I don't think I can stop you so go ahead.",
          provocative: "Do not give me those 90 seconds.",
        },
        reactions: {
          nice:        "Okay: pin = token, throw = transaction, scoring = consensus mechanism, missed throw = gas fee. Revolutionary.",
          neutral:     "Thank you. So: the pins represent decentralised nodes, the skittla is the governance token—",
          provocative: "I'm giving you the 90 seconds anyway. The mölkky pins are nodes in a proof-of-throw network—",
        },
      },
    ],
    [TIME_PERIODS.EVENING]: [
      {
        opening: "I've been networking since 6pm. Four conversations, two warm leads, one potential co-founder. Not bad for a sauna party.",
        responses: {
          nice:        "Who's the potential co-founder? That's exciting.",
          neutral:     "You're networking at a mökki weekend.",
          provocative: "Robert. These are your friends. Not leads.",
        },
        reactions: {
          nice:        "Allu. He said something philosophical that could be interpreted as a go-to-market strategy. I'm nurturing it.",
          neutral:     "The best networking happens when people are relaxed. This is peak networking conditions.",
          provocative: "Friends with co-founder potential. It's not either/or. It's synergy.",
        },
      },
      {
        opening: "I pitched Elliot a 'CoolerFi' concept. He handed me a drink and walked away. Classic early-adopter skepticism.",
        responses: {
          nice:        "CoolerFi. What's the actual pitch?",
          neutral:     "Elliot walked away from you.",
          provocative: "He wasn't skeptical. He was done with the conversation.",
        },
        reactions: {
          nice:        "Tokenised beverage access. You stake tokens to unlock cold drinks. Dynamic pricing based on remaining inventory.",
          neutral:     "Walked away to think. Classic incubation response. He'll be back with questions.",
          provocative: "The best investors always look uninterested at first. I've read about this.",
        },
      },
    ],
    [TIME_PERIODS.NIGHT]: [
      {
        opening: "I sent three emails from the dock. The midnight sun is great for productivity.",
        responses: {
          nice:        "Discipline. I respect the midnight grind.",
          neutral:     "You sent work emails from the mökki dock.",
          provocative: "Robert. Put the phone down. You're at a lake party.",
        },
        reactions: {
          nice:        "Opportunity doesn't take a midsummer break. I don't take a midsummer break. Synergy.",
          neutral:     "The dock has good signal. The dock is now a remote office. I'm disrupting commuting.",
          provocative: "The emails were lake-themed. I'm integrating work and life. That's the future.",
        },
      },
    ],
    [TIME_PERIODS.LATE_NIGHT]: [
      {
        opening: "2am and I just had my best idea of the night: MökkeDAO. Decentralised Finnish summer cottage ownership.",
        responses: {
          nice:        "Okay. That's kind of brilliant actually. How would it work?",
          neutral:     "Robert it is 2am.",
          provocative: "Go to sleep, Robert.",
        },
        reactions: {
          nice:        "NFT shares in a virtual mökki collective. Stake tokens to access saunas across Finland. Whitepaper by morning.",
          neutral:     "2am is when the mind is clear. The ideas are cleaner without daylight.",
          provocative: "Sleep is for people who don't have MökkeDAO to build. I'll sleep when it's funded.",
        },
      },
    ],
  },

  nixu: {
    [TIME_PERIODS.DAY]: [
      {
        opening: "I hereby DECREE that mölkky results shall be recorded officially. Robert cheats. The decree is enacted.",
        responses: {
          nice:        "The decree is wise and just. I support it fully.",
          neutral:     "Does Robert actually cheat?",
          provocative: "You can't just decree things. This isn't a parliament.",
        },
        reactions: {
          nice:        "Your support is noted in the official record. Welcome to the right side of mölkky history.",
          neutral:     "He moves the pins slightly before throwing. Barely perceptible. I perceive it.",
          provocative: "This IS a parliament. A mökki parliament. And I am the speaker. The decree stands.",
        },
      },
      {
        opening: "I've established a formal grill rotation. Everyone gets 12 minutes. The decree is posted on the sauna door.",
        responses: {
          nice:        "Finally. Order. I've been waiting for someone to establish this.",
          neutral:     "Did anyone agree to this grill rotation?",
          provocative: "Nobody agreed to a grill rotation, Nixu.",
        },
        reactions: {
          nice:        "Democracy requires structure. The structure is the grill rotation. Welcome aboard.",
          neutral:     "Agreement is implied by participation. They are all using the grill. They have all agreed.",
          provocative: "They didn't disagree either. In parliamentary terms, that's a quorum. Motion carried.",
        },
      },
    ],
    [TIME_PERIODS.EVENING]: [
      {
        opening: "I am calling an emergency session regarding the dock speaker volume. The motion is: too loud. All in favour?",
        responses: {
          nice:        "Aye. The motion carries my full support.",
          neutral:     "What's the quorum requirement for a dock speaker vote?",
          provocative: "Jon is going to veto this immediately.",
        },
        reactions: {
          nice:        "Aye recorded. Motion carries pending Jon's acknowledgment of the democratic process.",
          neutral:     "Two-thirds of present parties who are not currently DJing. The quorum is almost met.",
          provocative: "Jon's veto is constitutionally questionable. The speaker serves the collective.",
        },
      },
      {
        opening: "I propose a formal palju schedule. Two people, 20 minutes, rotating clockwise. It's in the decree.",
        responses: {
          nice:        "Seconded. The palju chaos has been unacceptable.",
          neutral:     "The palju has been fine without a schedule.",
          provocative: "Nixu it's a hot tub. People get in when they want.",
        },
        reactions: {
          nice:        "Seconded and recorded. You're the kind of person democracies need.",
          neutral:     "'Fine' is not optimal. The decree optimises for optimal.",
          provocative: "Unregulated palju access creates bottlenecks and temperature instability. The schedule is protective.",
        },
      },
    ],
    [TIME_PERIODS.NIGHT]: [
      {
        opening: "I declare this midsummer night officially exceptional. The vote was 8-1. Schmaxel abstained. Mark counted.",
        responses: {
          nice:        "The vote was correct. This night IS exceptional.",
          neutral:     "Who voted against?",
          provocative: "You held a vote about whether the night was exceptional.",
        },
        reactions: {
          nice:        "Unanimous would have been preferred but 8-1 is a democratic mandate. The night is official.",
          neutral:     "Robert. He wanted to amend 'exceptional' to 'pivotal'. The amendment failed.",
          provocative: "Democracy requires formal acknowledgment of quality. The vote was necessary and correct.",
        },
      },
    ],
    [TIME_PERIODS.LATE_NIGHT]: [
      {
        opening: "Final decree of the evening: everyone has been good. Even Alwar. The record is closed.",
        responses: {
          nice:        "That is a beautiful decree. Thank you, Nixu.",
          neutral:     "Even Alwar? He stole several things today.",
          provocative: "What does 'the record is closed' mean exactly?",
        },
        reactions: {
          nice:        "The thanks is yours. You were part of what made this worth decreeing.",
          neutral:     "Alwar's theft was redistributive. In the right light, it's almost civic.",
          provocative: "It means I'm going to sleep and the decrees stop until morning. Enjoy the anarchy.",
        },
      },
    ],
  },

  nikkebre: {
    [TIME_PERIODS.DAY]: [
      {
        opening: "The kiuas is at 110 degrees. This is fine. I am fine. Everyone should come in.",
        responses: {
          nice:        "110 is beautiful. I'm coming in. This is exactly what I needed.",
          neutral:     "110 degrees is extremely hot, Nikkebre.",
          provocative: "Nobody else is coming in. That temperature is dangerous.",
        },
        reactions: {
          nice:        "Yes. Come. Sit. Breathe slowly. The heat is teaching you something.",
          neutral:     "It's exactly hot enough. Your body just needs to negotiate with the heat. That's growth.",
          provocative: "It is perfectly safe for someone who has prepared. Have you prepared? Come in and prepare.",
        },
      },
      {
        opening: "I've been in the sauna since 8am. Time moves differently in there. It's like a philosophy.",
        responses: {
          nice:        "That makes complete sense. The sauna is its own world.",
          neutral:     "That's four hours. Have you eaten anything?",
          provocative: "It's not a philosophy. You just really like heat.",
        },
        reactions: {
          nice:        "Yes. Exactly. You understand. Most people don't stay long enough to understand.",
          neutral:     "The heat removes the need for food temporarily. Also there's water. I have a system.",
          provocative: "The heat clarifies what matters. Right now what matters is more heat. See: philosophy.",
        },
      },
    ],
    [TIME_PERIODS.EVENING]: [
      {
        opening: "Third sauna session of the day. The body adapts. The mind quiets. This is Finnish meditation.",
        responses: {
          nice:        "I want to try that. How long do you stay each session?",
          neutral:     "Three sessions seems like a lot.",
          provocative: "You're just really sweaty. That's what's happening.",
        },
        reactions: {
          nice:        "As long as it takes. First session is for the body. Second for the mind. Third for the spirit.",
          neutral:     "Three is the minimum for full benefit. I've done five before. Significant benefit.",
          provocative: "The sweat is the mechanism. The mechanism is the point. The sweat is growth.",
        },
      },
      {
        opening: "I've invited everyone to the sauna. Nobody has come. Their loss is their own and I respect it.",
        responses: {
          nice:        "I'll come. Right now. Let's go.",
          neutral:     "It's 120 degrees in there, Nikkebre.",
          provocative: "People are scared of your sauna specifically.",
        },
        reactions: {
          nice:        "*nods once* Good. Come. We will not talk for the first ten minutes. Respect the heat.",
          neutral:     "It was 120. I've brought it down to 115 for accessibility. Growth through compromise.",
          provocative: "Fear is the first step. After fear comes respect. After respect comes the sauna.",
        },
      },
    ],
    [TIME_PERIODS.NIGHT]: [
      {
        opening: "Midnight sauna. The water is warm, the night is bright, the heat is correct. This is what summer is.",
        responses: {
          nice:        "This is exactly what summer is. You're completely right.",
          neutral:     "Do you ever not go to the sauna?",
          provocative: "Go to sleep at some point, Nikkebre.",
        },
        reactions: {
          nice:        "*slow nod* Yes. Now you understand. Come join if you want.",
          neutral:     "On Tuesday, back home. But this is midsummer. Different rules apply.",
          provocative: "Sleep is for after the last sauna. The last sauna hasn't happened yet.",
        },
      },
    ],
    [TIME_PERIODS.LATE_NIGHT]: [
      {
        opening: "Last sauna of the night. 2am. 108 degrees. A quiet goodbye to midsummer. Come if you want.",
        responses: {
          nice:        "I'm in. A quiet goodbye. Let's go.",
          neutral:     "It's 2am and 108 degrees in there.",
          provocative: "Nikkebre. It is 2am.",
        },
        reactions: {
          nice:        "*says nothing, opens the sauna door*",
          neutral:     "Yes. The night earns it.",
          provocative: "The sauna doesn't care what time it is. Neither do I. Come or don't.",
        },
      },
    ],
  },

  immobile: {
    [TIME_PERIODS.DAY]: [
      {
        opening: "I did 300 burpees before everyone woke up. The lake was my protein shake. Good morning.",
        responses: {
          nice:        "300 burpees. Absolute beast. What's the rest of the training plan today?",
          neutral:     "You drank the lake?",
          provocative: "Nobody asked you to do 300 burpees at 6am at a mökki.",
        },
        reactions: {
          nice:        "Swim intervals at noon, mölkky as active recovery, evening jog on the forest path. You in?",
          neutral:     "Metaphorically. I swam 800 metres after the burpees. The lake is fuel.",
          provocative: "My body asked. My body has standards even when the rest of you are asleep.",
        },
      },
      {
        opening: "The dock is a perfect platform for box jumps. I've already done 40. The dock has not complained.",
        responses: {
          nice:        "The dock is built for it. What's next — dock pull-ups?",
          neutral:     "Please don't break the dock.",
          provocative: "Stop jumping on the dock. People are trying to relax on it.",
        },
        reactions: {
          nice:        "Already scouted the overhang for pull-ups. Structurally viable. Come spot me.",
          neutral:     "The dock is structurally sound. I've assessed it. I'm an assessor now.",
          provocative: "Relaxing is what happens after training. Come train. Then we relax. Correctly.",
        },
      },
    ],
    [TIME_PERIODS.EVENING]: [
      {
        opening: "Evening run: 8km forest loop, 94m elevation, personal best by 40 seconds. The trees witnessed it.",
        responses: {
          nice:        "8km forest loop at a mökki party? You are built different.",
          neutral:     "The trees witnessed it.",
          provocative: "You ran 8km away from the party and came back. Why.",
        },
        reactions: {
          nice:        "The mind is clearest after a hard run. I'm very clear right now. Ask me anything.",
          neutral:     "The trees are the best audience. They don't complain about the pace.",
          provocative: "To return stronger. The party needed a stronger version of me. It got it.",
        },
      },
      {
        opening: "I offered to run a group workout by the fire pit. Zero takers. I'm doing it solo. Accountability is internal.",
        responses: {
          nice:        "I'll join. What are we doing?",
          neutral:     "People are quite relaxed this evening.",
          provocative: "Nobody wants to work out at a mökki party, Immobile.",
        },
        reactions: {
          nice:        "Lateral raises, dips on the fire pit bench, core. Bring water. We start now.",
          neutral:     "Relaxed today, sore tomorrow. I don't make the rules. The body makes the rules.",
          provocative: "Correct. Their loss is my gain. I did it twice to compensate for the missing group energy.",
        },
      },
    ],
    [TIME_PERIODS.NIGHT]: [
      {
        opening: "Midnight cold swim: 300 metres. Water was 16 degrees. I feel incredible. You should try it.",
        responses: {
          nice:        "How long did it take you to get used to 16 degrees?",
          neutral:     "16 degrees in the middle of the night.",
          provocative: "I am not swimming in 16 degree water at midnight.",
        },
        reactions: {
          nice:        "First 30 seconds is negotiation. After that: clarity. After that: power. Come try.",
          neutral:     "The cold is the point. The cold wakes everything up. Then you sleep better.",
          provocative: "Your choice is valid. My choice is correct. We can both be at peace with this.",
        },
      },
    ],
    [TIME_PERIODS.LATE_NIGHT]: [
      {
        opening: "2am recovery stretching. The body doesn't sleep — it rebuilds. I'll be ready by 6am.",
        responses: {
          nice:        "That dedication is something else. What's the 6am plan?",
          neutral:     "You're stretching at 2am.",
          provocative: "Sleep is rebuilding. That's literally what sleep does.",
        },
        reactions: {
          nice:        "Swimming, then the forest loop again, then a cold shower, then I'll make breakfast for everyone.",
          neutral:     "And winning the morning. You should try it.",
          provocative: "Sleep is passive rebuilding. Stretching is active rebuilding. I choose activity.",
        },
      },
    ],
  },

  allu: {
    [TIME_PERIODS.DAY]: [
      {
        opening: "What if the mölkky pins... are US? Have you thought about that? No? Just me?",
        responses: {
          nice:        "Go on. I want to hear where this is going.",
          neutral:     "What does that mean exactly?",
          provocative: "The mölkky pins are pieces of wood, Allu.",
        },
        reactions: {
          nice:        "Okay so: we're all numbered, we stand in formation, someone throws things at us and we scatter. Is that not... us?",
          neutral:     "We're the pins. Society is the skittla. The game resets. We reconvene. Every time.",
          provocative: "Yes. Made of wood. Shaped by time. Numbered. Waiting to be knocked over. Exactly us.",
        },
      },
      {
        opening: "I've been sitting here for an hour and I've come to believe the lake knows something we don't.",
        responses: {
          nice:        "I think so too. What do you think it knows?",
          neutral:     "What makes you think that?",
          provocative: "The lake is water. It doesn't know things.",
        },
        reactions: {
          nice:        "Not sure yet. But it's been here longer than any of us. It's seen everyone who's ever stood on this dock. That has to accumulate.",
          neutral:     "It doesn't rush. It doesn't explain itself. It just... persists. That implies knowledge.",
          provocative: "Water has memory. Scientists found that out and then a lot of people got very uncomfortable with it.",
        },
      },
    ],
    [TIME_PERIODS.EVENING]: [
      {
        opening: "The fire is warm. The sky is light. Everyone is here. Why does this feel like it's already a memory?",
        responses: {
          nice:        "Because we're aware enough to feel it happening. That's rare.",
          neutral:     "Maybe because we know it'll end.",
          provocative: "It's not a memory yet. It's happening. Be here.",
        },
        reactions: {
          nice:        "Yes. We're watching ourselves from slightly ahead. That's either beautiful or terrifying. Or both.",
          neutral:     "Or because it's too good to feel real while it's real. So the mind files it early.",
          provocative: "I am here. And also slightly ahead of here, watching. Both are real. That's the thing.",
        },
      },
      {
        opening: "Elliot gave me a fourth drink but I only remember having one. Time is behaving oddly tonight.",
        responses: {
          nice:        "Time always behaves oddly when the night is this good.",
          neutral:     "You've had four drinks, Allu.",
          provocative: "You have had four drinks. That is what's happening.",
        },
        reactions: {
          nice:        "Yes. It folds. Like origami. You look up and two hours have gone somewhere useful.",
          neutral:     "Four drinks is just what Elliot says. Time says something different. I trust time more.",
          provocative: "Four is a number imposed from outside. From inside, it was one long, continuous experience. Both are true.",
        },
      },
    ],
    [TIME_PERIODS.NIGHT]: [
      {
        opening: "The midnight sun means today has no real ending. Does that make it last forever or make it not exist at all?",
        responses: {
          nice:        "Maybe it's both. A day that lasts forever by never quite starting.",
          neutral:     "I think it just means the sun stays up for a long time.",
          provocative: "It means there's no sunset tonight. That's it. That's the whole thing.",
        },
        reactions: {
          nice:        "*long pause* Yes. A day that contains itself like a loop. I'm going to sit with that for a while.",
          neutral:     "Yes. And what does that do to the meaning of nighttime? If there's no dark, is there really a day?",
          provocative: "But does the sun staying up change how the day FEELS? Because it feels different. Doesn't it feel different?",
        },
      },
    ],
    [TIME_PERIODS.LATE_NIGHT]: [
      {
        opening: "I should sleep but I don't want this to become yesterday. Once it's yesterday it's just a story.",
        responses: {
          nice:        "Then stay up a little longer. The story can wait.",
          neutral:     "It'll still have been real, even as a story.",
          provocative: "Go to sleep, Allu. It was a great day. Let it be a great day.",
        },
        reactions: {
          nice:        "*nods slowly* Yeah. Okay. Just a little longer.",
          neutral:     "That's true. But stories get edited. The raw version exists only now.",
          provocative: "...okay. But when I wake up, remind me it was this good. Just say 'it was this good'. That's all.",
        },
      },
    ],
  },
}
