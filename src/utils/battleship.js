export const FLEET = [{id:'carrier',name:'Carrier',size:5},{id:'battleship',name:'Battleship',size:4},{id:'cruiser',name:'Cruiser',size:3},{id:'submarine',name:'Submarine',size:3},{id:'destroyer',name:'Destroyer',size:2}];
export const square = (r,c) => `${r}_${c}`;
export function shipCells(row,col,size,vertical=false) {
  if(!Number.isInteger(row)||!Number.isInteger(col)||row<0||col<0||row+(vertical?size:1)>10||col+(vertical?1:size)>10) throw new Error('That ship does not fit here.');
  return Array.from({length:size},(_,i)=>square(row+(vertical?i:0),col+(vertical?0:i)));
}
export function validateFleet(fleet) {
  const occupied=new Set();
  for(const ship of FLEET){
    const placement=fleet?.[ship.id];
    if(!placement)throw new Error('Place all five ships first.');
    for(const cell of shipCells(placement.row,placement.col,ship.size,placement.vertical)){
      if(occupied.has(cell))throw new Error('Ships cannot overlap.');
      occupied.add(cell);
    }
  }
  return true;
}
export function randomFleet() {
  const fleet={},used=new Set();
  for(const ship of FLEET){
    for(let attempt=0;attempt<1000;attempt++){
      const vertical=Math.random()<.5,row=Math.floor(Math.random()*10),col=Math.floor(Math.random()*10);
      let cells;try{cells=shipCells(row,col,ship.size,vertical);}catch{continue;}
      if(cells.some(cell=>used.has(cell)))continue;
      fleet[ship.id]={row,col,vertical};cells.forEach(cell=>used.add(cell));break;
    }
  }
  validateFleet(fleet);return fleet;
}
export function updateBattleship(game,action){
  const {user,type,id,now}=action;
  if(!user?.id)throw new Error('Join the room first.');
  if(game?.lastCommandId===id)return game;
  if((game?.id||null)!==action.expectedGameId || (game && game.revision!==action.expectedRevision))throw new Error('The game changed. Try again.');
  if(type==='start'){
    if(game && game.status!=='finished')throw new Error('Finish the current game first.');
    return {id,revision:0,status:'setup',createdAt:now,starter:user.id,players:{[user.id]:{id:user.id,name:user.name||'Your person',ready:false}},fleets:{},shots:{},lastCommandId:id};
  }
  if(!game||game.status==='finished')throw new Error('Start a new game.');
  const next=structuredClone(game);
  next.fleets ||= {}; next.shots ||= {};
  if(type==='join'){
    if(next.players[user.id])return game;
    if(Object.keys(next.players).length>=2)throw new Error('This game is for two people.');
    next.players[user.id]={id:user.id,name:user.name||'Your person',ready:false};
  }else{
    if(!next.players[user.id])throw new Error('Join this game first.');
    if(type==='ready'){
      if(next.status!=='setup'||next.players[user.id].ready)throw new Error('Your fleet is already locked.');
      validateFleet(action.fleet);next.fleets[user.id]=action.fleet;next.players[user.id].ready=true;
      if(Object.keys(next.players).length===2 && Object.values(next.players).every(p=>p.ready)){next.status='playing';next.turn=next.starter;}
    }else if(type==='fire'){
      if(next.status!=='playing'||next.turn!==user.id)throw new Error('Wait for your turn.');
      const cell=shipCells(action.row,action.col,1)[0],opponent=Object.keys(next.players).find(key=>key!==user.id);
      const shots=next.shots[user.id]||{};
      if(shots[cell])throw new Error('You already fired here.');
      const hit=FLEET.find(ship=>{const p=next.fleets[opponent][ship.id];return shipCells(p.row,p.col,ship.size,p.vertical).includes(cell);});
      shots[cell]={hit:!!hit,shipId:hit?.id||'',at:now};next.shots[user.id]=shots;
      const sunk=hit && (()=>{const p=next.fleets[opponent][hit.id];return shipCells(p.row,p.col,hit.size,p.vertical).every(key=>shots[key]?.hit);})();
      if(sunk)shots[cell].sunk=hit.name;
      next.lastMove={name:user.name||'Your person',cell,hit:!!hit,sunk:sunk?hit.name:'',at:now};
      if(Object.values(shots).filter(shot=>shot.hit).length===17){next.status='finished';next.winnerId=user.id;next.winnerName=next.players[user.id].name;next.finishedAt=now;}
      else next.turn=opponent;
    }else if(type==='finish'){next.status='finished';next.finishedAt=now;}
    else throw new Error('Unknown move.');
  }
  next.revision++;next.lastCommandId=id;return next;
}
