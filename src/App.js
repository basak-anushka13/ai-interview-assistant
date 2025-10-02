import React, { useState, useEffect, useRef } from 'react';
import { Camera, Upload, Send, Clock, User, Mail, Phone, CheckCircle, XCircle, Play, Pause } from 'lucide-react';
import mammoth from 'mammoth';

// Initial state structure
const initialState = {
  candidates: [],
  currentCandidate: null,
  activeTab: 'interviewee'
};

// Question bank by difficulty
const questionBank = {
  easy: [
    "What is the difference between let, const, and var in JavaScript?",
    "Explain the concept of props in React.",
    "What is the purpose of package.json in a Node.js project?",
    "How do you create a functional component in React?"
  ],
  medium: [
    "Explain the difference between useEffect and useLayoutEffect hooks.",
    "What is middleware in Express.js and how do you use it?",
    "How does the virtual DOM work in React?",
    "Explain event delegation in JavaScript."
  ],
  hard: [
    "Design a scalable architecture for a real-time chat application using React and Node.js.",
    "Explain how you would optimize a React application that's experiencing performance issues.",
    "How would you implement authentication and authorization in a full-stack application?",
    "Describe how you would handle race conditions in asynchronous JavaScript code."
  ]
};

const App = () => {
  const [state, setState] = useState(() => {
    const saved = localStorage.getItem('interviewAppState');
    return saved ? JSON.parse(saved) : initialState;
  });
  
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);

  useEffect(() => {
    localStorage.setItem('interviewAppState', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const saved = localStorage.getItem('interviewAppState');
    if (saved) {
      const data = JSON.parse(saved);
      if (data.currentCandidate && !data.currentCandidate.completed) {
        setShowWelcomeBack(true);
      }
    }
  }, []);

  const switchTab = (tab) => {
    setState(prev => ({ ...prev, activeTab: tab }));
  };

  const startNewInterview = () => {
    setState(prev => ({
      ...prev,
      currentCandidate: {
        id: Date.now(),
        name: '',
        email: '',
        phone: '',
        resumeUploaded: false,
        chatHistory: [],
        questions: [],
        currentQuestionIndex: -1,
        score: 0,
        completed: false,
        isPaused: false,
        fieldCollectionPhase: true
      }
    }));
    setShowWelcomeBack(false);
  };

  const resumeInterview = () => {
    setShowWelcomeBack(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {showWelcomeBack && (
        <WelcomeBackModal onResume={resumeInterview} onStartNew={startNewInterview} />
      )}
      
      <div className="container mx-auto p-4">
        <header className="bg-white shadow-lg rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-indigo-600 mb-4">AI Interview Assistant</h1>
          <div className="flex gap-4">
            <button
              onClick={() => switchTab('interviewee')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                state.activeTab === 'interviewee'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Interviewee
            </button>
            <button
              onClick={() => switchTab('interviewer')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                state.activeTab === 'interviewer'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Interviewer Dashboard
            </button>
          </div>
        </header>

        {state.activeTab === 'interviewee' ? (
          <IntervieweeTab state={state} setState={setState} />
        ) : (
          <InterviewerTab state={state} setState={setState} />
        )}
      </div>
    </div>
  );
};

const WelcomeBackModal = ({ onResume, onStartNew }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-8 max-w-md shadow-2xl">
      <h2 className="text-2xl font-bold mb-4 text-indigo-600">Welcome Back!</h2>
      <p className="text-gray-600 mb-6">You have an unfinished interview. Would you like to continue?</p>
      <div className="flex gap-4">
        <button
          onClick={onResume}
          className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-all"
        >
          Resume Interview
        </button>
        <button
          onClick={onStartNew}
          className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all"
        >
          Start New
        </button>
      </div>
    </div>
  </div>
);

const IntervieweeTab = ({ state, setState }) => {
  const { currentCandidate } = state;

  if (!currentCandidate) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-12 text-center">
        <div className="mb-6">
          <User className="w-24 h-24 mx-auto text-indigo-300" />
        </div>
        <h2 className="text-2xl font-bold mb-4">Ready to Start Your Interview?</h2>
        <p className="text-gray-600 mb-6">Click below to begin the AI-powered interview process</p>
        <button
          onClick={() => {
            setState(prev => ({
              ...prev,
              currentCandidate: {
                id: Date.now(),
                name: '',
                email: '',
                phone: '',
                resumeUploaded: false,
                chatHistory: [],
                questions: [],
                currentQuestionIndex: -1,
                score: 0,
                completed: false,
                isPaused: false,
                fieldCollectionPhase: true
              }
            }));
          }}
          className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-all shadow-md"
        >
          Start Interview
        </button>
      </div>
    );
  }

  return <ChatInterface state={state} setState={setState} />;
};

const ChatInterface = ({ state, setState }) => {
  const { currentCandidate } = state;
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentCandidate?.chatHistory]);

  const extractTextFromPDF = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const text = e.target.result;
        resolve(text);
      };
      reader.readAsText(file);
    });
  };

  const extractTextFromDOCX = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const extractInfo = (text) => {
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/;
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
    
    const email = text.match(emailRegex)?.[0] || '';
    const phone = text.match(phoneRegex)?.[0] || '';
    
    const lines = text.split('\n');
    const name = lines[0]?.trim() || '';

    return { name, email, phone };
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.name.endsWith('.pdf') && !file.name.endsWith('.docx')) {
      alert('Please upload a PDF or DOCX file');
      return;
    }

    setUploading(true);

    try {
      let text = '';
      if (file.name.endsWith('.pdf')) {
        text = await extractTextFromPDF(file);
      } else {
        text = await extractTextFromDOCX(file);
      }

      const { name, email, phone } = extractInfo(text);

      setState(prev => ({
        ...prev,
        currentCandidate: {
          ...prev.currentCandidate,
          name,
          email,
          phone,
          resumeUploaded: true,
          chatHistory: [
            ...prev.currentCandidate.chatHistory,
            {
              type: 'system',
              message: 'Resume uploaded successfully! Let me extract your information...'
            }
          ]
        }
      }));

      setTimeout(() => {
        const missingFields = [];
        if (!name) missingFields.push('name');
        if (!email) missingFields.push('email');
        if (!phone) missingFields.push('phone');

        if (missingFields.length > 0) {
          setState(prev => ({
            ...prev,
            currentCandidate: {
              ...prev.currentCandidate,
              chatHistory: [
                ...prev.currentCandidate.chatHistory,
                {
                  type: 'bot',
                  message: `I extracted some information, but I need your ${missingFields.join(', ')}. Let's start with your ${missingFields[0]}:`
                }
              ],
              missingFields
            }
          }));
        } else {
          startInterview(name, email, phone);
        }
      }, 1000);
    } catch (error) {
      alert('Error processing file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const startInterview = (name, email, phone) => {
    const questions = [
      ...questionBank.easy.slice(0, 2).map(q => ({ text: q, difficulty: 'easy', time: 15 })),
      ...questionBank.medium.slice(0, 2).map(q => ({ text: q, difficulty: 'medium', time: 45 })),
      ...questionBank.hard.slice(0, 2).map(q => ({ text: q, difficulty: 'hard', time: 90 }))
    ];

    setState(prev => ({
      ...prev,
      currentCandidate: {
        ...prev.currentCandidate,
        name,
        email,
        phone,
        fieldCollectionPhase: false,
        questions,
        currentQuestionIndex: 0,
        chatHistory: [
          ...prev.currentCandidate.chatHistory,
          {
            type: 'bot',
            message: `Great! Hello ${name}. Let's begin your Full Stack Developer interview. You'll answer 6 questions: 2 Easy, 2 Medium, and 2 Hard. Each has a time limit. Ready?`
          },
          {
            type: 'bot',
            message: `Question 1 (Easy - 15s): ${questions[0].text}`,
            isQuestion: true
          }
        ]
      }
    }));
  };

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const newHistory = [
      ...currentCandidate.chatHistory,
      { type: 'user', message }
    ];

    if (currentCandidate.fieldCollectionPhase) {
      const { missingFields = [], name, email, phone } = currentCandidate;
      let updatedCandidate = { ...currentCandidate };

      if (missingFields[0] === 'name') {
        updatedCandidate.name = message;
        updatedCandidate.missingFields = missingFields.slice(1);
      } else if (missingFields[0] === 'email') {
        updatedCandidate.email = message;
        updatedCandidate.missingFields = missingFields.slice(1);
      } else if (missingFields[0] === 'phone') {
        updatedCandidate.phone = message;
        updatedCandidate.missingFields = missingFields.slice(1);
      }

      if (updatedCandidate.missingFields.length > 0) {
        newHistory.push({
          type: 'bot',
          message: `Thank you! Now, please provide your ${updatedCandidate.missingFields[0]}:`
        });
      } else {
        startInterview(updatedCandidate.name, updatedCandidate.email, updatedCandidate.phone);
      }

      setState(prev => ({
        ...prev,
        currentCandidate: {
          ...updatedCandidate,
          chatHistory: newHistory
        }
      }));
    } else {
      // Handle answer submission
      const currentQuestion = currentCandidate.questions[currentCandidate.currentQuestionIndex];
      const score = evaluateAnswer(message, currentQuestion.difficulty);
      
      currentCandidate.questions[currentCandidate.currentQuestionIndex].answer = message;
      currentCandidate.questions[currentCandidate.currentQuestionIndex].score = score;
      currentCandidate.score += score;

      const nextIndex = currentCandidate.currentQuestionIndex + 1;
      
      if (nextIndex < currentCandidate.questions.length) {
        newHistory.push({
          type: 'bot',
          message: `Question ${nextIndex + 1} (${currentCandidate.questions[nextIndex].difficulty} - ${currentCandidate.questions[nextIndex].time}s): ${currentCandidate.questions[nextIndex].text}`,
          isQuestion: true
        });

        setState(prev => ({
          ...prev,
          currentCandidate: {
            ...currentCandidate,
            currentQuestionIndex: nextIndex,
            chatHistory: newHistory
          }
        }));
      } else {
        completeInterview(currentCandidate, newHistory);
      }
    }

    setMessage('');
  };

  const evaluateAnswer = (answer, difficulty) => {
    if (!answer || answer.trim().length === 0) return 0;
    
    const length = answer.trim().length;
    const words = answer.trim().split(/\s+/).length;
    const baseScore = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 7 : 10;
    
    // Very short answers (less than 20 characters or 5 words)
    if (length < 20 || words < 5) {
      return Math.floor(baseScore * 0.2);
    }
    
    // Short answers (20-50 chars or 5-15 words)
    if (length < 50 || words < 15) {
      return Math.floor(baseScore * 0.4);
    }
    
    // Moderate answers (50-100 chars or 15-30 words)
    if (length < 100 || words < 30) {
      return Math.floor(baseScore * 0.6);
    }
    
    // Good answers (100-200 chars or 30-50 words)
    if (length < 200 || words < 50) {
      return Math.floor(baseScore * 0.8);
    }
    
    // Excellent answers (200+ chars or 50+ words)
    return baseScore;
  };

  const completeInterview = (candidate, history) => {
    const summary = generateSummary(candidate);
    
    history.push({
      type: 'bot',
      message: `Interview completed! Your total score: ${candidate.score}/42\n\nSummary: ${summary}`
    });

    const completedCandidate = {
      ...candidate,
      completed: true,
      summary,
      chatHistory: history
    };

    setState(prev => ({
      ...prev,
      candidates: [...prev.candidates, completedCandidate],
      currentCandidate: null
    }));
  };

  const generateSummary = (candidate) => {
    const percentage = (candidate.score / 42) * 100;
    if (percentage >= 80) return "Excellent candidate with strong full-stack knowledge. Highly recommended.";
    if (percentage >= 60) return "Good candidate with solid understanding. Recommended with minor training.";
    if (percentage >= 40) return "Average candidate. May need significant training in certain areas.";
    return "Below expectations. Consider additional screening or training.";
  };

  if (!currentCandidate.resumeUploaded) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-12 text-center">
        <Upload className="w-24 h-24 mx-auto text-indigo-300 mb-6" />
        <h2 className="text-2xl font-bold mb-4">Upload Your Resume</h2>
        <p className="text-gray-600 mb-6">Please upload your resume (PDF or DOCX format)</p>
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileUpload}
          className="hidden"
          id="resume-upload"
          disabled={uploading}
        />
        <label
          htmlFor="resume-upload"
          className="bg-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-all shadow-md cursor-pointer inline-block"
        >
          {uploading ? 'Processing...' : 'Choose File'}
        </label>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">{currentCandidate.name || 'Candidate'}</h3>
            <p className="text-sm text-gray-600">{currentCandidate.email}</p>
          </div>
          {!currentCandidate.fieldCollectionPhase && currentCandidate.currentQuestionIndex >= 0 && (
            <div className="text-right">
              <p className="text-sm text-gray-600">Question {currentCandidate.currentQuestionIndex + 1} of 6</p>
              <p className="text-lg font-bold text-indigo-600">Score: {currentCandidate.score}/42</p>
            </div>
          )}
        </div>
      </div>

      <div className="h-96 overflow-y-auto p-6 space-y-4">
        {currentCandidate.chatHistory.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-md p-4 rounded-lg ${
                msg.type === 'user'
                  ? 'bg-indigo-600 text-white'
                  : msg.type === 'system'
                  ? 'bg-gray-100 text-gray-700'
                  : 'bg-blue-50 text-gray-800'
              }`}
            >
              {msg.message}
            </div>
          </div>
        ))}
        {!currentCandidate.fieldCollectionPhase && currentCandidate.currentQuestionIndex >= 0 && (
          <QuestionTimer
            question={currentCandidate.questions[currentCandidate.currentQuestionIndex]}
            onTimeout={() => handleSendMessage()}
            isPaused={currentCandidate.isPaused}
          />
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-6 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type your answer..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={handleSendMessage}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-all"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

const QuestionTimer = ({ question, onTimeout, isPaused }) => {
  const [timeLeft, setTimeLeft] = useState(question.time);

  useEffect(() => {
    // Reset timer when question changes
    setTimeLeft(question.time);
  }, [question]);

  useEffect(() => {
    if (isPaused || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPaused, timeLeft, onTimeout]);

  return (
    <div className="flex items-center justify-center gap-2 text-lg font-semibold">
      <Clock className="w-5 h-5" />
      <span className={timeLeft <= 10 ? 'text-red-600' : 'text-gray-700'}>
        Time Left: {timeLeft}s
      </span>
    </div>
  );
};

const InterviewerTab = ({ state, setState }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const filteredCandidates = state.candidates
    .filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'score') return b.score - a.score;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

  if (selectedCandidate) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <button
          onClick={() => setSelectedCandidate(null)}
          className="mb-4 text-indigo-600 hover:text-indigo-700 font-semibold"
        >
          ← Back to Dashboard
        </button>
        
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">{selectedCandidate.name}</h2>
          <div className="flex gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1"><Mail className="w-4 h-4" /> {selectedCandidate.email}</span>
            <span className="flex items-center gap-1"><Phone className="w-4 h-4" /> {selectedCandidate.phone}</span>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-indigo-600">{selectedCandidate.score}/42</span>
            <p className="text-gray-600 mt-2">{selectedCandidate.summary}</p>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-xl font-bold">Interview Questions & Answers</h3>
          {selectedCandidate.questions.map((q, idx) => (
            <div key={idx} className="border rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <p className="font-semibold">Q{idx + 1}: {q.text}</p>
                <span className={`px-3 py-1 rounded text-sm font-semibold ${
                  q.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                  q.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {q.difficulty.toUpperCase()}
                </span>
              </div>
              <p className="text-gray-700 mb-2"><strong>Answer:</strong> {q.answer || 'No answer provided'}</p>
              <p className="text-indigo-600 font-semibold">Score: {q.score}/{q.difficulty === 'easy' ? 5 : q.difficulty === 'medium' ? 7 : 10}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Candidate Dashboard</h2>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="score">Sort by Score</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {filteredCandidates.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <User className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>No candidates yet. Complete some interviews to see results here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredCandidates.map(candidate => (
            <div
              key={candidate.id}
              onClick={() => setSelectedCandidate(candidate)}
              className="border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-bold">{candidate.name}</h3>
                  <p className="text-sm text-gray-600">{candidate.email}</p>
                  <p className="text-sm text-gray-500 mt-1">{candidate.summary}</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-indigo-600">{candidate.score}/42</span>
                  <p className="text-sm text-gray-600">{Math.round((candidate.score / 42) * 100)}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default App;