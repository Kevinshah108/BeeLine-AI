import { useCallback, useEffect, useState } from "react";
import ReactFlow, {
  Background,
  addEdge,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";
import axios from "axios";
import ReactMarkdown from "react-markdown";

let id = 3;
const getId = () => `${id++}`;

function App() {
  const [promptMap, setPromptMap] = useState({});
  const [resultMap, setResultMap] = useState({});
  const [loadingNode, setLoadingNode] = useState(null);
  const [history, setHistory] = useState([]);

  /* =========================
     FETCH HISTORY
  ========================= */
  const fetchHistory = async () => {
    try {
      const res = await axios.get("https://beeline-ai-backend.onrender.com/api/history");
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
      position: { x: 200, y: 200 },
      data: {},
    },
    {
      id: "2",
      position: { x: 450, y: 200 },
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
          x: Math.random() * 400 + 100,
          y: Math.random() * 300 + 100,
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
      const res = await axios.post("https://beeline-ai-backend.onrender.com/api/ask-ai", {
        prompt,
      });

      const output = res.data.result;

      setResultMap({
        [outputNode.id]: output,
      });

      // SAVE TO DB
      await axios.post("https://beeline-ai-backend.onrender.com/api/save", {
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
      await axios.delete(`https://beeline-ai-backend.onrender.com/api/delete/${id}`);
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

            {/* INPUT */}
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

            {/* OUTPUT */}
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

            {/* OTHER */}
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
    <div className="h-screen flex flex-col md:flex-row bg-gray-900 text-white">

      {/* SIDEBAR */}
      <div className="w-full md:w-72 bg-white/10 backdrop-blur p-4 overflow-y-auto border-b md:border-r border-white/10">
        <h2 className="text-lg font-bold mb-3">📜 History</h2>

        {history.length === 0 ? (
          <p className="text-gray-400">No history</p>
        ) : (
          history.map((item) => (
            <div
              key={item._id}
              className="mb-3 p-2 bg-white/10 rounded hover:bg-white/20"
            >
              {/* CLICK TO LOAD */}
              <div
                className="cursor-pointer"
                onClick={() => {
                  const inputNode = nodes[0]?.id;
                  const outputNode = nodes[1]?.id;

                  setPromptMap({
                    [inputNode]: item.prompt,
                  });

                  setResultMap({
                    [outputNode]: item.response,
                  });
                }}
              >
                <p className="text-sm font-semibold truncate">
                  {item.prompt}
                </p>
                <p className="text-xs text-gray-300 truncate">
                  {item.response}
                </p>
              </div>

              {/* DELETE BUTTON */}
              <button
                onClick={() => deleteHistory(item._id)}
                className="text-red-400 text-xs mt-1"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>

      {/* MAIN */}
      <div className="flex-1 flex flex-col">

        {/* HEADER */}
        <div className="p-3 bg-gray-800 flex justify-between items-center">
          <h1 className="text-lg font-bold text-blue-400">
            🐝BeeLine AI
          </h1>

          <div className="flex gap-2">
            <button onClick={addNode} className="bg-blue-600 px-3 py-1 rounded">
              Add Node
            </button>

            <button onClick={deleteNode} className="bg-red-600 px-3 py-1 rounded">
              Delete Node
            </button>

            <button onClick={runFlow} className="bg-green-600 px-3 py-1 rounded">
              Run Flow
            </button>
          </div>
        </div>

        {/* FLOW */}
        <div className="flex-1">
          <ReactFlow
            nodes={updatedNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            defaultViewport={{ x: 0, y: 0, zoom: 3.0 }}
            minZoom={0.5}
            maxZoom={1.2}
            panOnScroll
            zoomOnScroll
          >
            <Background gap={25} size={1.2} />
          </ReactFlow>
        </div>
      </div>
    </div>
  );
}

export default App;