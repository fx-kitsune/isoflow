import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  CircularProgress,
  IconButton as MuiIconButton,
  Divider
} from '@mui/material';
import { Send, Close } from '@mui/icons-material';
import { UiElement } from 'src/components/UiElement/UiElement';
import { useUiStateStore } from 'src/stores/uiStateStore';
import { useInitialDataManager } from 'src/hooks/useInitialDataManager';
import { useModelStore } from 'src/stores/modelStore';
import { modelFromModelStore } from 'src/utils';

export const ChatPanel = () => {
  const uiStateActions = useUiStateStore((state) => {
    return state.actions;
  });
  const llmOptionsStore = useUiStateStore((state) => {
    return state.llmOptions;
  });
  const { load } = useInitialDataManager();
  const [messages, setMessages] = useState<
    { role: 'user' | 'assistant'; content: string }[]
  >([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modelStore = useModelStore((state) => {
    return state;
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => {
      return [...prev, { role: 'user', content: userMessage }];
    });
    setIsLoading(true);

    try {
      const llmOptions = llmOptionsStore || {
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        apiKey: ''
      };

      const currentModel = modelFromModelStore(modelStore);

      const systemPrompt = `You are an AI assistant that generates network diagrams for Isoflow.
The current diagram JSON is: ${JSON.stringify(currentModel, null, 2)}
Return ONLY valid JSON that matches this schema, representing the requested changes. Do not include markdown formatting or explanations.`;

      if (!llmOptions.apiKey) {
        setTimeout(() => {
          setMessages((prev) => {
            return [
              ...prev,
              {
                role: 'assistant',
                content: 'Vui lòng cung cấp API Key để sử dụng tính năng này.'
              }
            ];
          });
          setIsLoading(false);
        }, 1000);
        return;
      }

      const response = await fetch(
        llmOptions.apiUrl || 'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${llmOptions.apiKey}`
          },
          body: JSON.stringify({
            model: llmOptions.model || 'gpt-3.5-turbo',
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages.map((m) => {
                return { role: m.role, content: m.content };
              }),
              { role: 'user', content: userMessage }
            ],
            temperature: 0.1
          })
        }
      );

      const data = await response.json();
      const { content } = data.choices[0].message;

      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? jsonMatch[0] : content;
        const parsedModel = JSON.parse(jsonStr);
        load(parsedModel);
        setMessages((prev) => {
          return [
            ...prev,
            {
              role: 'assistant',
              content: 'Đã cập nhật flow theo yêu cầu của bạn!'
            }
          ];
        });
      } catch (err) {
        setMessages((prev) => {
          return [
            ...prev,
            {
              role: 'assistant',
              content: 'Xin lỗi, tôi không thể tạo ra định dạng JSON hợp lệ.'
            }
          ];
        });
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(error);
      setMessages((prev) => {
        return [
          ...prev,
          { role: 'assistant', content: 'Có lỗi xảy ra khi kết nối với AI.' }
        ];
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <UiElement
      sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <Box
        sx={{
          p: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <Typography variant="h6">AI Chat</Typography>
        <MuiIconButton
          size="small"
          onClick={() => {
            return uiStateActions.setIsChatPanelOpen(false);
          }}
        >
          <Close fontSize="small" />
        </MuiIconButton>
      </Box>
      <Divider />

      <Box
        sx={{
          flexGrow: 1,
          overflowY: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}
      >
        {messages.length === 0 && (
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Hãy yêu cầu tôi vẽ hoặc chỉnh sửa diagram!
          </Typography>
        )}
        {messages.map((msg, idx) => {
          return (
            <Box
              // eslint-disable-next-line react/no-array-index-key
              key={idx}
              sx={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                bgcolor: msg.role === 'user' ? 'primary.main' : 'grey.200',
                color:
                  msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                p: 1.5,
                borderRadius: 2,
                maxWidth: '85%'
              }}
            >
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {msg.content}
              </Typography>
            </Box>
          );
        })}
        {isLoading && (
          <Box sx={{ alignSelf: 'flex-start', p: 1.5 }}>
            <CircularProgress size={20} />
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      <Divider />
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ p: 1, display: 'flex', gap: 1 }}
      >
        <TextField
          fullWidth
          size="small"
          placeholder="Nhập yêu cầu..."
          value={input}
          onChange={(e) => {
            return setInput(e.target.value);
          }}
          disabled={isLoading}
        />
        <MuiIconButton
          type="submit"
          color="primary"
          disabled={!input.trim() || isLoading}
        >
          <Send />
        </MuiIconButton>
      </Box>
    </UiElement>
  );
};
