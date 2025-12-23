import React, { useRef, useCallback, useEffect, useState } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Typography,
  Chip,
  Divider,
  FormControlLabel,
  Switch,
  Slider,
  Paper,
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  FormatListBulleted,
  FormatListNumbered,
  FormatQuote,
  FormatSize,
  Undo,
  Redo,
  FindReplace,
  Spellcheck,
  TextFields,
  History,
} from '@mui/icons-material';

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSelectionChange?: (start: number, end: number, selectedText: string) => void;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  minRows?: number;
  maxRows?: number;
  showToolbar?: boolean;
  showWordCount?: boolean;
  showCharacterCount?: boolean;
  readOnly?: boolean;
  fontSize?: number;
  onFontSizeChange?: (size: number) => void;
}

export interface TextSelection {
  start: number;
  end: number;
  text: string;
}

export function RichTextEditor({
  value,
  onChange,
  onSelectionChange,
  placeholder = '在此输入或编辑您的内容...',
  disabled = false,
  autoFocus = false,
  minRows = 8,
  maxRows = 20,
  showToolbar = true,
  showWordCount = true,
  showCharacterCount = true,
  readOnly = false,
  fontSize = 14,
  onFontSizeChange,
}: RichTextEditorProps) {
  const textFieldRef = useRef<HTMLTextAreaElement>(null);
  const [selection, setSelection] = useState<TextSelection>({ start: 0, end: 0, text: '' });
  const [toolbarAnchor, setToolbarAnchor] = useState<null | HTMLElement>(null);
  const [findReplaceOpen, setFindReplaceOpen] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [currentFontSize, setCurrentFontSize] = useState(fontSize);

  // Text statistics
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const characterCount = value.length;
  const characterCountNoSpaces = value.replace(/\s/g, '').length;
  const paragraphCount = value.split(/\n\s*\n/).filter(p => p.trim()).length;

  // Handle text selection
  const handleSelectionChange = useCallback(() => {
    if (!textFieldRef.current) return;

    const textarea = textFieldRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    const newSelection = { start, end, text: selectedText };
    setSelection(newSelection);

    if (onSelectionChange) {
      onSelectionChange(start, end, selectedText);
    }
  }, [value, onSelectionChange]);

  // Handle content change
  const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = event.target.value;
    onChange(newValue);
  }, [onChange]);

  // Text formatting functions
  const insertTextAtCursor = useCallback((text: string) => {
    if (!textFieldRef.current) return;

    const textarea = textFieldRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const newValue = value.substring(0, start) + text + value.substring(end);
    onChange(newValue);

    // Restore cursor position
    setTimeout(() => {
      if (textFieldRef.current) {
        const newPosition = start + text.length;
        textFieldRef.current.setSelectionRange(newPosition, newPosition);
        textFieldRef.current.focus();
      }
    }, 0);
  }, [value, onChange]);

  const wrapSelectedText = useCallback((prefix: string, suffix: string = prefix) => {
    if (!textFieldRef.current) return;

    const textarea = textFieldRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    const wrappedText = prefix + selectedText + suffix;
    const newValue = value.substring(0, start) + wrappedText + value.substring(end);
    onChange(newValue);

    // Restore selection
    setTimeout(() => {
      if (textFieldRef.current) {
        const newStart = start + prefix.length;
        const newEnd = newStart + selectedText.length;
        textFieldRef.current.setSelectionRange(newStart, newEnd);
        textFieldRef.current.focus();
      }
    }, 0);
  }, [value, onChange]);

  // Formatting handlers
  const handleBold = useCallback(() => {
    wrapSelectedText('**');
  }, [wrapSelectedText]);

  const handleItalic = useCallback(() => {
    wrapSelectedText('*');
  }, [wrapSelectedText]);

  const handleUnderline = useCallback(() => {
    wrapSelectedText('<u>', '</u>');
  }, [wrapSelectedText]);

  const handleBulletList = useCallback(() => {
    const lines = selection.text.split('\n');
    const bulletedLines = lines.map(line => line.trim() ? `• ${line.trim()}` : line);
    const newText = bulletedLines.join('\n');
    
    if (!textFieldRef.current) return;
    
    const textarea = textFieldRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const newValue = value.substring(0, start) + newText + value.substring(end);
    onChange(newValue);
  }, [selection.text, value, onChange]);

  const handleNumberedList = useCallback(() => {
    const lines = selection.text.split('\n');
    const numberedLines = lines.map((line, index) => 
      line.trim() ? `${index + 1}. ${line.trim()}` : line
    );
    const newText = numberedLines.join('\n');
    
    if (!textFieldRef.current) return;
    
    const textarea = textFieldRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const newValue = value.substring(0, start) + newText + value.substring(end);
    onChange(newValue);
  }, [selection.text, value, onChange]);

  const handleQuote = useCallback(() => {
    const lines = selection.text.split('\n');
    const quotedLines = lines.map(line => line.trim() ? `> ${line.trim()}` : line);
    const newText = quotedLines.join('\n');
    
    if (!textFieldRef.current) return;
    
    const textarea = textFieldRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const newValue = value.substring(0, start) + newText + value.substring(end);
    onChange(newValue);
  }, [selection.text, value, onChange]);

  // Find and replace functionality
  const handleFindReplace = useCallback(() => {
    if (!findText) return;

    const regex = new RegExp(findText, 'gi');
    const newValue = value.replace(regex, replaceText);
    onChange(newValue);
    
    setFindReplaceOpen(false);
    setFindText('');
    setReplaceText('');
  }, [value, findText, replaceText, onChange]);

  // Font size handling
  const handleFontSizeChange = useCallback((_event: Event, newValue: number | number[]) => {
    const size = Array.isArray(newValue) ? newValue[0] : newValue;
    setCurrentFontSize(size);
    if (onFontSizeChange) {
      onFontSizeChange(size);
    }
  }, [onFontSizeChange]);

  // Toolbar menu handlers
  const handleToolbarOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setToolbarAnchor(event.currentTarget);
  }, []);

  const handleToolbarClose = useCallback(() => {
    setToolbarAnchor(null);
  }, []);

  // Auto-focus effect
  useEffect(() => {
    if (autoFocus && textFieldRef.current) {
      textFieldRef.current.focus();
    }
  }, [autoFocus]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Toolbar */}
      {showToolbar && (
        <Paper
          elevation={1}
          sx={{
            p: 1,
            mb: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            flexWrap: 'wrap',
            backgroundColor: '#f8f9fa',
          }}
        >
          {/* Formatting buttons */}
          <Tooltip title="粗体">
            <IconButton size="small" onClick={handleBold} disabled={disabled || readOnly}>
              <FormatBold />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="斜体">
            <IconButton size="small" onClick={handleItalic} disabled={disabled || readOnly}>
              <FormatItalic />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="下划线">
            <IconButton size="small" onClick={handleUnderline} disabled={disabled || readOnly}>
              <FormatUnderlined />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          <Tooltip title="项目符号列表">
            <IconButton size="small" onClick={handleBulletList} disabled={disabled || readOnly}>
              <FormatListBulleted />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="编号列表">
            <IconButton size="small" onClick={handleNumberedList} disabled={disabled || readOnly}>
              <FormatListNumbered />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="引用">
            <IconButton size="small" onClick={handleQuote} disabled={disabled || readOnly}>
              <FormatQuote />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

          <Tooltip title="查找替换">
            <IconButton 
              size="small" 
              onClick={() => setFindReplaceOpen(true)} 
              disabled={disabled || readOnly}
            >
              <FindReplace />
            </IconButton>
          </Tooltip>

          <Tooltip title="更多选项">
            <IconButton size="small" onClick={handleToolbarOpen}>
              <TextFields />
            </IconButton>
          </Tooltip>

          {/* Font size slider */}
          <Box sx={{ display: 'flex', alignItems: 'center', ml: 2, minWidth: 120 }}>
            <FormatSize sx={{ mr: 1, fontSize: 16 }} />
            <Slider
              size="small"
              value={currentFontSize}
              onChange={handleFontSizeChange}
              min={10}
              max={24}
              step={1}
              sx={{ width: 80 }}
            />
            <Typography variant="caption" sx={{ ml: 1, minWidth: 24 }}>
              {currentFontSize}
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Main text editor */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <TextField
          inputRef={textFieldRef}
          multiline
          fullWidth
          value={value}
          onChange={handleChange}
          onSelect={handleSelectionChange}
          onKeyUp={handleSelectionChange}
          onMouseUp={handleSelectionChange}
          placeholder={placeholder}
          disabled={disabled}
          minRows={minRows}
          maxRows={maxRows}
          sx={{
            flex: 1,
            '& .MuiInputBase-root': {
              height: '100%',
              alignItems: 'flex-start',
            },
            '& .MuiInputBase-input': {
              height: '100% !important',
              overflow: 'auto !important',
              fontSize: `${currentFontSize}px`,
              lineHeight: 1.6,
              fontFamily: '"Helvetica Neue", Arial, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
            },
          }}
          InputProps={{
            readOnly,
            sx: {
              backgroundColor: readOnly ? '#f5f5f5' : 'white',
            },
          }}
        />

        {/* Statistics bar */}
        {(showWordCount || showCharacterCount) && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mt: 1,
              p: 1,
              backgroundColor: '#f8f9fa',
              borderRadius: 1,
            }}
          >
            <Box sx={{ display: 'flex', gap: 2 }}>
              {showWordCount && (
                <Typography variant="caption" color="text.secondary">
                  字数: {wordCount}
                </Typography>
              )}
              {showCharacterCount && (
                <Typography variant="caption" color="text.secondary">
                  字符: {characterCount} ({characterCountNoSpaces}不含空格)
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary">
                段落: {paragraphCount}
              </Typography>
            </Box>

            {selection.text && (
              <Typography variant="caption" color="primary">
                已选择: {selection.text.length} 字符
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Toolbar menu */}
      <Menu
        anchorEl={toolbarAnchor}
        open={Boolean(toolbarAnchor)}
        onClose={handleToolbarClose}
        PaperProps={{
          sx: { minWidth: 200 }
        }}
      >
        <MenuItem onClick={() => { insertTextAtCursor('\n---\n'); handleToolbarClose(); }}>
          插入分隔线
        </MenuItem>
        <MenuItem onClick={() => { insertTextAtCursor('\n\n'); handleToolbarClose(); }}>
          插入段落分隔
        </MenuItem>
        <MenuItem onClick={() => { insertTextAtCursor('【】'); handleToolbarClose(); }}>
          插入方括号
        </MenuItem>
        <MenuItem onClick={() => { insertTextAtCursor('「」'); handleToolbarClose(); }}>
          插入书名号
        </MenuItem>
      </Menu>

      {/* Find and Replace Dialog */}
      {findReplaceOpen && (
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            top: 60,
            right: 20,
            p: 2,
            minWidth: 300,
            zIndex: 1000,
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            查找和替换
          </Typography>
          
          <TextField
            fullWidth
            size="small"
            label="查找"
            value={findText}
            onChange={(e) => setFindText(e.target.value)}
            sx={{ mb: 1 }}
          />
          
          <TextField
            fullWidth
            size="small"
            label="替换为"
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <IconButton size="small" onClick={() => setFindReplaceOpen(false)}>
              ✕
            </IconButton>
            <IconButton size="small" onClick={handleFindReplace} disabled={!findText}>
              ✓
            </IconButton>
          </Box>
        </Paper>
      )}
    </Box>
  );
}