import { useCallback, useEffect, useState } from "react";
import ReactFlow, {
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import ReactMarkdown from "react-markdown";
import API from "./api";

let id = 3;
const getId = () => `${id++}`;

function App() {
  const [promptMap, setPromptMap] = useState({});
  const [resultMap, setResultMap] = useState({});
  const [loadingNode, setLoadingNode] = useState(null);
  const [history, setHistory] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- RESPONSIVE LOGIC ---
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const nodeScale = isMobile ? 0.8 : 1; // Shrink nodes to 80% on mobile
  const nodeWidth = isMobile ? 220 : 280; // Narrower boxes for mobile

  /* =========================
      FETCH HISTORY
  ========================= */
  const fetchHistory = async () => {
    try {
      const res = await API.get("/history");
      setHistory(res.data);
    } catch (err) {
      console.error("History error:", err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  /* =========================
      INITIAL NODES
  ========================= */
  const initialNodes = [
    {
      id: "1",
      position: { x: isMobile ? 50 : 100, y: isMobile ? 50 : 100 },
      data: {},
    },
    {
      id: "2",
      position: { x: isMobile ? 50 : 450, y: isMobile ? 350 : 100 },
      data: {},
    },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);

  /* =========================
      EDGE CONFIG
  ========================= */
  const [edges, setEdges, onEdgesChange] = useEdgesState([
    {
      id: "e1-2",
      source: "1",
      target: "2",
      animated: true,
      style: { stroke: "#3b82f6", strokeWidth: 2 },
    },
  ]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  /* =========================
      ACTIONS
  ========================= */
  const addNode = () => {
    const newId = getId();
    setNodes((nds) => [
      ...nds,
      {
        id: newId,
        position: {
          x: Math.random() * (isMobile ? 100 : 400) + 50,
          y: Math.random() * 300 + 100,
        },
        data: {},
      },
    ]);
  };

  const deleteNode = () => {
    if (nodes.length <= 1) return;
    setNodes((nds) => nds.slice(0, -1));
  };

  const runFlow = async () => {
    const inputNode = nodes[0];
    const outputNode = nodes[1];
    const prompt = promptMap[inputNode.id];

    if (!prompt) {
      alert("Please enter a prompt");
      return;
    }

    setLoadingNode(outputNode.id);
    try {
      const res = await API.post("/ask-ai", { prompt });
      const output = res.data.result;
      setResultMap((prev) => ({ ...prev, [outputNode.id]: output }));
      await API.post("/save", { prompt, response: output });
      fetchHistory();
    } catch (err) {
      console.error("AI Flow Error:", err);
    } finally {
      setLoadingNode(null);
    }
  };

  const deleteHistory = async (id) => {
    try {
      await API.delete(`/delete/${id}`);
      fetchHistory();
    } catch (err) {
      console.error("Delete Error:", err);
    }
  };

  /* =========================
      NODE UI (SCALED)
  ========================= */
  const updatedNodes = nodes.map((node, index) => {
    const isInput = index === 0;
    const isOutput = index === 1;

    return {
      ...node,
      dragHandle: '.drag-handle',
      // DYNAMIC SCALING APPLIED HERE
      style: { 
        width: nodeWidth,
        transform: `scale(${nodeScale})`,
        transformOrigin: 'top left'
      },
      data: {
        label: (
          <div className="p-3 rounded-xl bg-white text-black shadow-2xl border border-gray-200">
            <div className="drag-handle cursor-grab active:cursor-grabbing mb-2 pb-1 border-b border-gray-100 flex justify-between items-center">
              <span className="text-[9px] font-extrabold uppercase tracking-tighter text-gray-400">
                {isInput ? "SOURCE" : isOutput ? "RESPONSE" : "NODE"}
              </span>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-100" />
                <div className="w-1.5 h-1.5 rounded-full bg-blue-100" />
              </div>
            </div>

            {isInput && (
              <textarea
                className="w-full min-h-[70px] p-2 text-xs border border-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none bg-gray-50"
                placeholder="Type here..."
                value={promptMap[node.id] || ""}
                onChange={(e) => setPromptMap({ ...promptMap, [node.id]: e.target.value })}
              />
            )}

            {isOutput && (
              <div className="text-[11px] min-h-[40px] max-h-40 overflow-y-auto pr-1 custom-scrollbar leading-relaxed">
                {loadingNode === node.id ? (
                  <div className="flex items-center gap-2 text-blue-500 font-medium">
                    <span className="animate-pulse">●</span> Processing...
                  </div>
                ) : (
                  <ReactMarkdown className="prose prose-xs">
                    {resultMap[node.id] || "Pending..."}
                  </ReactMarkdown>
                )}
              </div>
            )}

            {!isInput && !isOutput && (
              <p className="text-gray-400 text-[10px] text-center py-2 italic">Bridge Node</p>
            )}
          </div>
        ),
      },
    };
  });

  return (
    <div className="h-screen w-full flex flex-col bg-[#0b0f1a] text-slate-200 overflow-hidden font-sans">
      
      {/* HEADER */}
      <header className="z-50 px-4 py-3 bg-[#161b2c]/90 backdrop-blur-lg border-b border-white/5 flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-2 bg-white/5 rounded-lg border border-white/10"
          >
            {isSidebarOpen ? "✕" : "📜"}
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">🐝</span>
            <h1 className="text-md font-bold tracking-tight hidden sm:block">
              BeeLine <span className="text-blue-500">AI</span>
            </h1>
          </div>
        </div>

        <div className="flex gap-1.5">
          <button onClick={addNode} className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase transition-all">
            +
          </button>
          <button onClick={deleteNode} className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase text-red-400 transition-all">
            -
          </button>
          <button 
            onClick={runFlow} 
            disabled={!!loadingNode}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-700/20 transition-all"
          >
            {loadingNode ? "..." : "Run"}
          </button>
        </div>
      </header>

      <main className="flex flex-1 relative overflow-hidden">
        {/* SIDEBAR */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-[#111625] border-r border-white/5 
          transform transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0
          ${isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
        `}>
          <div className="p-5 h-full flex flex-col">
            <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-4">History</h2>
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
              {history.map((item) => (
                <div
                  key={item._id}
                  className="group relative p-3 bg-white/5 rounded-xl border border-transparent hover:border-blue-500/30 hover:bg-white/[0.07] transition-all cursor-pointer"
                  onClick={() => {
                    setPromptMap({ [nodes[0].id]: item.prompt });
                    setResultMap({ [nodes[1].id]: item.response });
                    if (isMobile) setIsSidebarOpen(false);
                  }}
                >
                  <p className="text-[11px] font-bold text-blue-400 truncate mb-1">{item.prompt}</p>
                  <p className="text-[10px] text-gray-500 line-clamp-1 italic">{item.response}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteHistory(item._id); }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-[10px] text-red-400"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* WORKSPACE */}
        <section className="flex-1 relative">
          {isSidebarOpen && isMobile && (
            <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setIsSidebarOpen(false)} />
          )}
          
          <ReactFlow
            nodes={updatedNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            // --- SMART PADDING & ZOOM ---
            fitView
            fitViewOptions={{ padding: isMobile ? 0.6 : 0.2, includeNodeSize: true }}
            minZoom={0.05}
            maxZoom={1.2}
            zoomOnScroll={!isMobile}
            panOnScroll={isMobile}
          >
            <Background color="#1e293b" gap={25} size={1} />
          </ReactFlow>
        </section>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .react-flow__handle { width: 6px; height: 6px; background: #3b82f6; border: 1.5px solid #0b0f1a; }
        .react-flow__edge-path { stroke: #3b82f6; stroke-width: 2.5; filter: drop-shadow(0 0 5px rgba(59, 130, 246, 0.4)); }
      `}} />
    </div>
  );
}

export default App;