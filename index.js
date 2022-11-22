const fetch = require('node-fetch');
const { key } = require('./settings.json');

const sortAsc = (a, b) => a - b;
const sortDesc = (a, b) => b - a;
const reduceSum = (s, a) => s + a;
const roundOff = (number, places) => Math.round(number * Math.pow(10, places))/Math.pow(10, places);

const getTeamWinScore = t => t.wScores.reduce(reduceSum, 0) / t.gameCount;

const main = async () => {
  const year = 2022;
  const games = await fetch(`https://api.collegefootballdata.com/games?year=${year}&seasonType=regular&division=fbs`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${key}`,
    },
  }).then(res => res.json());

  const teamMap = {};
  games.forEach(game => {
    const { home_id, home_points, away_id, away_points, completed } = game;
    if (!teamMap[home_id] && game.home_division === 'fbs') {
      teamMap[home_id] = {
        id: home_id,
        name: game.home_team,
        division: game.home_division,
        wins: [],
        losses: [],
      };
    }
    if (!teamMap[away_id] && game.away_division === 'fbs') {
      teamMap[away_id] = {
        id: away_id,
        name: game.away_team,
        division: game.away_division,
        wins: [],
        losses: [],
      };
    }
    if (completed) {
      let loser = home_id, winner = away_id;
      if (home_points > away_points) {
        winner = home_id;
        loser = away_id;
      }
      teamMap[winner] && teamMap[winner].wins.push(loser);
      teamMap[loser] && teamMap[loser].losses.push(winner);
    }
  });
  const teams = Object.values(teamMap);
  teams.forEach(team => {
    let score = 0;
    let count = 0;

    team.wScores = [];
    team.wins.forEach(w => {
      if (teamMap[w]) {
        const wScore = teamMap[w].wins.length;
        score += wScore;
        team.wScores.push(wScore);
        count += 1;
      }
    });

    team.lScores = [];
    team.losses.forEach(l => {
      if (teamMap[l]) {
        const lScore = teamMap[l].losses.length;
        score -= lScore;
        team.lScores.push(lScore);
        count += 1;
      }
    });
    team.score = score / count;
    team.rawScore = score;
    team.gameCount = count;
    team.wScores.sort(sortDesc);
    team.lScores.sort(sortAsc);
  });

  const teamsByWinScore = teams.map(getTeamWinScore).sort(sortDesc);
  teams.sort((a, b) => {
    if (b.score === a.score) {
      return b.wins.length - a.wins.length;
    }
    return b.score - a.score;
  }).forEach((t, i) => {
    const wScore = getTeamWinScore(t);
    const rank = teamsByWinScore.indexOf(wScore) + 1; 
    console.log(`${i + 1}. ${t.name} ${t.wins.length}-${t.losses.length} (${
      roundOff(t.score, 3)
    }) wins [${t.wScores.join()}] losses [${t.lScores.map(x => -x).join()}] (score before loss punishment: ${
      roundOff(wScore, 3)
    } rank: ${rank})`);
  });
};

main();
