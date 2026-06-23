/**
 * ユーザー登録機能を提供するページコンポーネント
 * 新規ユーザーの登録フォームを表示し、登録APIと連携
 */
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  Link,
} from '@mui/material';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { GENERAL_ERRORS } from '../constants/errorMessages';
import { authApi } from '../services/api';
import { RegisterCredentials } from '../types/types';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  // 登録情報の状態管理 - ユーザー名、パスワードを含む
  const [credentials, setCredentials] = useState<RegisterCredentials>({
    username: '',
    password: '',
  });
  // エラーメッセージの状態管理
  const [error, setError] = useState<string>('');

  /**
   * フォーム入力値の変更を処理するハンドラー
   * 入力フィールドの変更をcredentials状態に反映
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value, // 動的にプロパティ名を使用して状態を更新
    }));
  };

  /**
   * 登録フォームの送信を処理するハンドラー
   * 登録APIを呼び出し、成功時はトークンを保存してタスク一覧ページに遷移
   * 失敗時はエラーメッセージを表示
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // フォームのデフォルト送信動作を防止
    try {
      const response = await authApi.register(credentials);
      localStorage.setItem('token', response.token); // 認証トークンをローカルストレージに保存
      navigate('/tasks'); // タスク一覧ページにリダイレクト
    } catch (err) {
      setError(err instanceof Error ? err.message : GENERAL_ERRORS.UNEXPECTED_ERROR);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 8, height: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <Box sx={{ width: '100%', maxWidth: 520 }}>
          <Paper elevation={3} sx={{ p: 4 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography
                component="h1"
                variant="h5"
                gutterBottom
                sx={{ color: '#fff8dc' }}
              >
                ユーザー登録
              </Typography>
              {/* エラーがある場合のみアラートを表示 */}
              {error && (
                <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
                  {error}
                </Alert>
              )}
              {/* 登録フォーム */}
              <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  label="ユーザー名"
                  name="username"
                  value={credentials.username}
                  onChange={handleChange}
                  variant="outlined"
                  sx={{
                    // 入力文字（通常）
                    'input': { color: '#fff8dc' },

                    // ラベル（通常）
                    '& .MuiInputLabel-root': {
                      color: '#fff8dc',
                    },

                    // ラベル（フォーカス時 → オレンジ）
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#ef9c17',
                    },

                    // 枠線（通常）
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: '#fff8dc',
                      },

                      // ホバー
                      '&:hover fieldset': {
                        borderColor: '#ef9c17',
                      },

                      // フォーカス時 → オレンジ
                      '&.Mui-focused fieldset': {
                        borderColor: '#ef9c17',
                      },
                    },
                  }}
                />
                {/* パスワード入力フィールド */}
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="パスワード"
                  type="password"
                  id="password"
                  autoComplete="current-password"
                  value={credentials.password}
                  onChange={handleChange}
                  variant="outlined"
                  sx={{
                    // 入力文字（通常）
                    'input': { color: '#fff' },

                    // ラベル（通常）
                    '& .MuiInputLabel-root': {
                      color: '#fff',
                    },

                    // ラベル（フォーカス時 → オレンジ）
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: '#ef9c17',
                    },

                    // 枠線
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: '#fff',
                      },
                      '&:hover fieldset': {
                        borderColor: '#ef9c17',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#ef9c17',
                      },
                    },
                  }}
                />
                {/* 登録ボタン */}
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ mt: 3, mb: 2 }}
                >
                  登録
                </Button>
                {/* ログインページへのリンク */}
                <Box sx={{ textAlign: 'center' }}>
                  <Link href="/login" variant="body2">
                    既にアカウントをお持ちの方はこちら
                  </Link>
                </Box>
              </Box>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Container>
  );
};

export default RegisterPage;
