
export async function GET(){
  return Response.json({
    top:{asset:"BTC",confidence:71,label:"Bullish"},
    grid:[
      {asset:"BTC",confidence:71},
      {asset:"ETH",confidence:65},
      {asset:"SOL",confidence:52},
      {asset:"ADA",confidence:42}
    ]
  })
}
