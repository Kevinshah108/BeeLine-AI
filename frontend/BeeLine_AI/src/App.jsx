import { useCallback, useEffect, useState } from "react";
import ReactFlow, {
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import axios from "axios";
import API from "./api";
import ReactMarkdown from "react-markdown";

let id = 3;
const getId = () => `${id++}`;

function App() {
  const [promptMap, setPromptMap] = useState({});
  const [resultMap, setResultMap] = useState({});
  const [loadingNode, setLoadingNode] = useState(null);
  const [history, setHistory] = useState([]);
  // NEW: State for mobile menu
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
      position: { x: 50, y: 100 },
      data: {},
    },
    {
      id: "2",
      position: { x: 350, y: 100 },
      data: {},
    },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);

  /* =========================
      EDGE
  ========================= */
  const [edges, setEdges, onEdgesChange] = useEdgesState([
    {
      id: "e1-2",
      source: "1",
      target: "2",
      animated: true,
    },
  ]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    []
  );

  /* =========================
      ADD NODE
  ========================= */
  const addNode = () => {
    const newId = getId();
    setNodes((nds) => [
      ...nds,
      {
        id: newId,
        position: {
          x: Math.random() * 200 + 50,
          y: Math.random() * 200 + 50,
        },
        data: {},
      },
    ]);
  };

  /* =========================
      DELETE NODE
  ========================= */
  const deleteNode = () => {
    if (nodes.length <= 1) return;
    setNodes((nds) => nds.slice(0, -1));
  };

  /* =========================
      RUN FLOW
  ========================= */
  const runFlow = async () => {
    const inputNode = nodes[0];
    const outputNode = nodes[1];

    const prompt = promptMap[inputNode.id];

    if (!prompt) {
      alert("Enter prompt");
      return;
    }

    setLoadingNode(outputNode.id);

    try {
      const res = await API.post("/ask-ai", { prompt });
      const output = res.data.result;

      setResultMap({
        [outputNode.id]: output,
      });

      await API.post("/save", {
        prompt,
        response: output,
      });

      fetchHistory();
    } catch (err) {
      console.error("AI Error:", err);
    }

    setLoadingNode(null);
  };

  /* =========================
      DELETE HISTORY
  ========================= */
  const deleteHistory = async (id) => {
    try {
      await API.delete(`/delete/${id}`);
      fetchHistory();
    } catch (err) {
      console.error(err);
    }
  };

  /* =========================
      NODE UI
  ========================= */
  const updatedNodes = nodes.map((node, index) => {
    const isInput = index === 0;
    const isOutput = index === 1;

    return {
      ...node,
      style: { width: "auto", maxWidth: 260 },
      data: {
        label: (
          <div className="min-w-[180px] max-w-[240px] w-auto p-3 rounded-xl bg-white text-black shadow-lg border">
            {isInput && (
              <>
                <div className="text-xs text-gray-400 mb-1">Input</div>
                <textarea
                  className="w-full min-h-[60px] max-h-[120px] p-2 border rounded mb-2 resize-none overflow-auto"
                  placeholder="Enter prompt..."
                  value={promptMap[node.id] || ""}
                  onChange={(e) =>
                    setPromptMap({
                      [node.id]: e.target.value,
                    })
                  }
                />
              </>
            )}

            {isOutput && (
              <>
                <div className="text-xs text-gray-400 mb-1">Output</div>
                {loadingNode === node.id ? (
                  <p className="text-gray-500 animate-pulse">Thinking...</p>
                ) : (
                  <div className="text-sm max-h-32 overflow-y-auto">
                    <ReactMarkdown>
                      {resultMap[node.id] || "Output here"}
                    </ReactMarkdown>
                  </div>
                )}
              </>
            )}

            {!isInput && !isOutput && (
              <p className="text-gray-400 text-sm text-center">
                Intermediate Node
              </p>
            )}
          </div>
        ),
      },
    };
  });

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white relative overflow-hidden">
      
      {/* HEADER */}
      <div className="z-50 p-3 bg-gray-800 flex justify-between items-center border-b border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
          {/* MOBILE TOGGLE BUTTON */}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            {isSidebarOpen ? "✕" : "📜"}
          </button>
          <h1 className="text-lg font-bold text-blue-400 flex items-center gap-1">
            <span>🐝</span>
            <span className="hidden sm:inline">BeeLine AI</span>
          </h1>
        </div>

        <div className="flex gap-2">
          <button onClick={addNode} className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-sm transition-all font-medium">
            Add
          </button>
          <button onClick={deleteNode} className="bg-red-600/80 hover:bg-red-700 px-3 py-1.5 rounded-lg text-sm transition-all font-medium">
            Del
          </button>
          <button onClick={runFlow} className="bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg text-sm shadow-lg shadow-green-900/20 transition-all font-medium">
            Run
          </button>
        </div>
      </div>

      <div className="flex flex-1 relative overflow-hidden">
        {/* SIDEBAR - Responsive Overlay */}
        <div className={`
          fixed inset-y-0 left-0 z-40 w-72 bg-gray-800/95 backdrop-blur-md p-4 
          transform transition-transform duration-300 ease-in-out border-r border-white/10
          md:relative md:translate-x-0
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-100">
              📜 History
            </h2>
          </div>

          <div className="space-y-3 overflow-y-auto h-[calc(100vh-120px)] pr-2 custom-scrollbar">
            {history.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No history yet...</p>
            ) : (
              history.map((item) => (
                <div
                  key={item._id}
                  className="group relative p-3 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 hover:border-blue-500/30 transition-all cursor-pointer"
                  onClick={() => {
                    const inputNode = nodes[0]?.id;
                    const outputNode = nodes[1]?.id;
                    setPromptMap({ [inputNode]: item.prompt });
                    setResultMap({ [outputNode]: item.response });
                    // Close sidebar on mobile after selection
                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                  }}
                >
                  <p className="text-sm font-semibold text-blue-300 truncate mb-1">
                    {item.prompt}
                  </p>
                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                    {item.response}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteHistory(item._id);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 text-xs bg-gray-900/80 p-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* FLOW CANVAS */}
        <div className="flex-1 bg-gray-900 relative">
          {/* Overlay to close sidebar when clicking canvas on mobile */}
          {isSidebarOpen && (
            <div 
              className="absolute inset-0 z-30 bg-black/40 md:hidden transition-opacity"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
          
          <ReactFlow
            nodes={updatedNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
            minZoom={0.2}
            maxZoom={1.5}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          >
            <Background color="#333" gap={20} />
          </ReactFlow>
        </div>
      </div>

      {/* CUSTOM CSS FOR SCROLLBAR */}
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #444; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
      `}} />
    </div>
  );
}

export default App;