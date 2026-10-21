"""Mini jeu de données BDB (1 jeu, 3 joueurs + ballon) pour les tests sans données réelles."""

PFF_HEADER = (
    '"gameId","playId","nflId","pff_role","pff_positionLinedUp","pff_hit","pff_hurry",'
    '"pff_sack","pff_beatenByDefender","pff_hitAllowed","pff_hurryAllowed","pff_sackAllowed",'
    '"pff_nflIdBlockedPlayer","pff_blockType","pff_backFieldBlock"\n'
)
PLAYS_HEADER = (
    '"gameId","playId","playDescription","quarter","down","yardsToGo","possessionTeam",'
    '"defensiveTeam","yardlineSide","yardlineNumber","gameClock","preSnapHomeScore",'
    '"preSnapVisitorScore","passResult","penaltyYards","prePenaltyPlayResult","playResult",'
    '"foulName1","foulNFLId1","foulName2","foulNFLId2","foulName3","foulNFLId3",'
    '"absoluteYardlineNumber","offenseFormation","personnelO","defendersInBox","personnelD",'
    '"dropBackType","pff_playAction","pff_passCoverage","pff_passCoverageType"\n'
)


def write_mini_dataset(root, block_type="PP"):
    (root / "tracking").mkdir(parents=True)
    (root / "games.csv").write_text(
        '"gameId","season","week","gameDate","gameTimeEastern","homeTeamAbbr","visitorTeamAbbr"\n'
        '1,2021,6,"10/17/2021","16:25:00","DEN","LV"\n'
    )
    (root / "players.csv").write_text(
        '"nflId","height","weight","birthDate","collegeName","officialPosition","displayName"\n'
        '10,"6-5",310,"1995-01-01","X","T","Tackle"\n'
        '20,"6-4",255,NA,NA,"DE","Rusher"\n'
        '30,"6-2",215,"1992-11-10","Y","QB","Quarterback"\n'
    )
    (root / "plays.csv").write_text(
        PLAYS_HEADER + '1,7,"desc",1,3,8,"DEN","LV","DEN",34,"09:53",0,7,"S",NA,-3,-3,'
        "NA,NA,NA,NA,NA,NA,44,"
        '"SHOTGUN","1 RB, 1 TE, 3 WR",6,"4 DL, 2 LB, 5 DB","TRADITIONAL",0,"Cover-1","Man"\n'
    )
    (root / "pffScoutingData.csv").write_text(
        PFF_HEADER
        + f'1,7,10,"Pass Block","LT",NA,NA,NA,0,0,1,0,20,"{block_type}",0\n'
        + '1,7,20,"Pass Rush","ROLB",0,1,0,NA,NA,NA,NA,NA,NA,NA\n'
        + '1,7,30,"Pass","QB",NA,NA,NA,NA,NA,NA,NA,NA,NA,NA\n'
    )
    header = (
        "gameId,playId,nflId,frameId,time,jerseyNumber,team,playDirection,x,y,s,a,dis,o,dir,event\n"
    )
    rows = []
    for f in range(1, 4):
        ev = {1: "ball_snap", 3: "pass_forward"}.get(f, "None")
        rows.append(f"1,7,10,{f},t,70,DEN,left,60.0,20.0,1,1,0.1,90,90,{ev}")
        rows.append(f"1,7,20,{f},t,98,LV,left,58.0,20.0,1,1,0.1,270,270,{ev}")
        rows.append(f"1,7,30,{f},t,5,DEN,left,65.0,20.0,1,1,0.1,90,90,{ev}")
        rows.append(f"1,7,NA,{f},t,NA,football,left,59.0,20.0,1,1,0.1,NA,NA,{ev}")
    (root / "tracking" / "tracking_1.csv").write_text(header + "\n".join(rows) + "\n")
