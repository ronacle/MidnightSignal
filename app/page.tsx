import Beacon from "../components/Beacon";

export default function Page() {
  return (
    <main style={{padding:40, textAlign:"center"}}>
      <Beacon />
      <h1 style={{
        fontSize:"2.5rem",
        marginBottom:10,
        background:"linear-gradient(90deg,#60a5fa,#a78bfa)",
        WebkitBackgroundClip:"text",
        color:"transparent"
      }}>
        Midnight Signal
      </h1>

      <div style={{
        marginTop:30,
        padding:20,
        borderRadius:20,
        background:"rgba(15,23,42,0.8)",
        boxShadow:"0 10px 30px rgba(0,0,0,0.4)"
      }}>
        <div style={{fontSize:14, opacity:.6}}>Tonight’s Top Signal</div>
        <div style={{
          fontSize:32,
          fontWeight:"bold",
          color:"#86efac",
          textShadow:"0 0 20px rgba(134,239,172,0.6)"
        }}>
          BTC • Bullish
        </div>
        <div style={{marginTop:10, opacity:.7}}>
          Strong momentum + high confidence
        </div>

        <div style={{
          marginTop:15,
          height:8,
          borderRadius:999,
          background:"rgba(255,255,255,0.1)",
          overflow:"hidden"
        }}>
          <div style={{
            width:"72%",
            height:"100%",
            background:"linear-gradient(90deg,#86efac,#22c55e)"
          }} />
        </div>
      </div>

      <div style={{
        marginTop:30,
        opacity:.5,
        fontSize:12
      }}>
        v7.4.0
      </div>
    </main>
  );
}
