import { useCallback, useEffect, useState } from "react";
import ReactFlow, {
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import ReactMarkdown from "react-markdown";
import API from "./api"; // Your central Axios instance

let id = 3;
const getId = () => `${id++}`;

function App() {
  const [promptMap, setPromptMap] = useState({});
  const [resultMap, setResultMap] = useState({});
  const [loadingNode, setLoadingNode] = useState(null);
  const [history, setHistory] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Detect mobile for dynamic adjustments
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

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
      // Stacks nodes vertically on mobile, horizontally on desktop
      position: { x: isMobile ? 50 : 100, y: 100 },
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
      ACTIONS (ADD / DELETE)
  ========================= */
  const addNode = () => {
    const newId = getId();
    setNodes((nds) => [
      ...nds,
      {
        id: newId,
        position: {
          x: Math.random() * (isMobile ? 100 : 400) + 50,
          y: Math.random() * (isMobile ? 300 : 300) + 100,
        },
        data: {},
      },
    ]);
  };

  const deleteNode = () => {
    if (nodes.length <= 1) return;
    setNodes((nds) => nds.slice(0, -1));
  };

  /* =========================
      RUN FLOW (AI CALL)
  ========================= */
  const runFlow = async () => {
    const inputNode = nodes[0];
    const outputNode = nodes[1];
    const prompt = promptMap[inputNode.id];

    if (!prompt) {
      alert("Please enter a prompt in the Input Node");
      return;
    }

    setLoadingNode(outputNode.id);

    try {
      // 1. Get AI Response
      const res = await API.post("/ask-ai", { prompt });
      const output = res.data.result;

      setResultMap((prev) => ({ ...prev, [outputNode.id]: output }));

      // 2. Save to MongoDB
      await API.post("/save", { prompt, response: output });

      // 3. Refresh sidebar
      fetchHistory();
    } catch (err) {
      console.error("AI Flow Error:", err);
    } finally {
      setLoadingNode(null);
    }
  };

  /* =========================
      DELETE HISTORY
  ========================= */
  const deleteHistory = async (id) => {
    try {
      await API.delete(`/delete/${id}`);
      fetchHistory();
    } catch (err) {
      console.error("Delete Error:", err);
    }
  };

  /* =========================
      NODE COMPONENT UI
  ========================= */
  const updatedNodes = nodes.map((node, index) => {
    const isInput = index === 0;
    const isOutput = index === 1;

    return {
      ...node,
      dragHandle: '.drag-handle',
      style: { width: "auto", maxWidth: 280 },
      data: {
        label: (
          <div className="min-w-[200px] max-w-[260px] p-3 rounded-xl bg-white text-black shadow-2xl border border-gray-200">
            <div className="drag-handle cursor-grab active:cursor-grabbing mb-2 pb-1 border-b border-gray-100 flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                {isInput ? "Input Source" : isOutput ? "AI Output" : "Logic Node"}
              </span>
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
                <div className="w-1.5 h-1.5 rounded-full bg-gray-200" />
              </div>
            </div>

            {isInput && (
              <textarea
                className="w-full min-h-[80px] p-2 text-sm border border-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none bg-gray-50"
                placeholder="Ask Gemini something..."
                value={promptMap[node.id] || ""}
                onChange={(e) => setPromptMap({ ...promptMap, [node.id]: e.target.value })}
              />
            )}

            {isOutput && (
              <div className="text-sm min-h-[40px] max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                {loadingNode === node.id ? (
                  <div className="flex items-center gap-2 text-blue-500 font-medium italic">
                    <span className="animate-bounce">●</span> Thinking...
                  </div>
                ) : (
                  <ReactMarkdown className="prose prose-sm prose-slate">
                    {resultMap[node.id] || "Results will appear here..."}
                  </ReactMarkdown>
                )}
              </div>
            )}

            {!isInput && !isOutput && (
              <p className="text-gray-400 text-xs text-center py-4 italic">
                Intermediate logic connection
              </p>
            )}
          </div>
        ),
      },
    };
  });

  return (
    <div className="h-screen w-full flex flex-col bg-[#0b0f1a] text-slate-200 overflow-hidden font-sans">
      
      {/* HEADER */}
      <header className="z-50 px-4 py-3 bg-[#161b2c]/80 backdrop-blur-md border-b border-white/5 flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-all"
          >
            {isSidebarOpen ? "✕" : "📜"}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/40">
              <span className="text-xl">🐝</span>
            </div>
            <h1 className="text-lg font-bold tracking-tight hidden xs:block">
              BeeLine <span className="text-blue-500">AI</span>
            </h1>
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={addNode} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold transition-all">
            + Node
          </button>
          <button onClick={deleteNode} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-red-400 transition-all">
            Delete
          </button>
          <button 
            onClick={runFlow} 
            disabled={!!loadingNode}
            className="px-5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-xs font-bold shadow-lg shadow-blue-700/20 transition-all"
          >
            {loadingNode ? "Processing..." : "Run Flow"}
          </button>
        </div>
      </header>

      <main className="flex flex-1 relative overflow-hidden">
        {/* RESPONSIVE SIDEBAR */}
        <aside className={`
          fixed inset-y-0 left-0 z-40 w-72 bg-[#111625] border-r border-white/5 
          transform transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0
          ${isSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
        `}>
          <div className="p-5 h-full flex flex-col">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Prompt History</h2>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {history.length === 0 ? (
                <div className="text-center py-10 opacity-30 text-sm">Empty History</div>
              ) : (
                history.map((item) => (
                  <div
                    key={item._id}
                    className="group relative p-3 bg-white/5 rounded-xl border border-transparent hover:border-blue-500/50 hover:bg-white/[0.08] transition-all cursor-pointer"
                    onClick={() => {
                      setPromptMap({ [nodes[0].id]: item.prompt });
                      setResultMap({ [nodes[1].id]: item.response });
                      if (isMobile) setIsSidebarOpen(false);
                    }}
                  >
                    <p className="text-xs font-bold text-blue-400 truncate mb-1">{item.prompt}</p>
                    <p className="text-[11px] text-gray-400 line-clamp-2 leading-tight">{item.response}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteHistory(item._id); }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded bg-red-900/50 text-red-200 hover:bg-red-800 transition-all"
                    >
                      🗑
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* FLOW WORKSPACE */}
        <section className="flex-1 relative bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px]">
          {isSidebarOpen && isMobile && (
            <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setIsSidebarOpen(false)} />
          )}
          
          <ReactFlow
            nodes={updatedNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.1}
            maxZoom={1.5}
            zoomOnScroll={!isMobile}
            panOnScroll={isMobile}
          >
            <Background color="#1e293b" gap={24} />
          </ReactFlow>
        </section>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
        .react-flow__handle { width: 8px; height: 8px; background: #3b82f6; border: 2px solid #0b0f1a; }
        .react-flow__node { border-radius: 12px; }
      `}} />
    </div>
  );
}

export default App;