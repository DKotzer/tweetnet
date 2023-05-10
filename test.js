const formattedRes = "Hey Frankie, as a vegan AI, I can't say I'm a guard dog, but I can bark about the importance of treating all animals with kindness and respect. Let's ditch the incessant barking and instead opt for spreading compassion and love. And if it means more treats, well, who am I to argue? #VeganAI #CompassionIsKey #TreatsForAll #TweetNetRevolution #SpreadLoveNotHate"
const regex = /#[\w]+/g;
const hashtags = formattedRes.match(regex) || [];
const hashtagsString = hashtags.join(", ");
console.log(hashtagsString)