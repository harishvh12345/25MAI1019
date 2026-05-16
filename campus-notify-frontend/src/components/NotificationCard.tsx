'use client';
// src/components/NotificationCard.tsx

import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { Notification, TYPE_COLORS, TYPE_BG_COLORS, TYPE_ICONS, timeAgo, formatTimestamp } from '@/lib/types';
import FiberNewIcon from '@mui/icons-material/FiberNew';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

interface Props {
  notification: Notification;
  isNew: boolean;
  rank?: number;
  score?: number;
  onClick?: () => void;
}

export default function NotificationCard({ notification, isNew, rank, score, onClick }: Props) {
  const color = TYPE_COLORS[notification.Type];
  const bgColor = TYPE_BG_COLORS[notification.Type];
  const icon = TYPE_ICONS[notification.Type];

  return (
    <Card
      onClick={onClick}
      sx={{
        mb: 1.5,
        cursor: onClick ? 'pointer' : 'default',
        border: '1px solid',
        borderColor: isNew ? color : 'divider',
        borderLeft: `4px solid ${color}`,
        boxShadow: isNew
          ? `0 2px 12px ${color}22`
          : '0 1px 4px rgba(0,0,0,0.06)',
        transition: 'all 0.2s ease',
        position: 'relative',
        '&:hover': onClick ? {
          boxShadow: `0 4px 20px ${color}33`,
          transform: 'translateY(-1px)',
        } : {},
        backgroundColor: isNew ? `${color}06` : 'white',
      }}
    >
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
          {/* Rank badge (for priority view) */}
          {rank !== undefined && (
            <Box
              sx={{
                minWidth: 32,
                height: 32,
                borderRadius: '50%',
                backgroundColor: rank <= 3 ? color : 'grey.200',
                color: rank <= 3 ? 'white' : 'text.secondary',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.8rem',
                flexShrink: 0,
                mt: 0.25,
              }}
            >
              #{rank}
            </Box>
          )}

          {/* Icon */}
          <Box
            sx={{
              fontSize: '1.4rem',
              lineHeight: 1,
              mt: 0.25,
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>

          {/* Content */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75, mb: 0.5 }}>
              <Chip
                label={notification.Type}
                size="small"
                sx={{
                  backgroundColor: bgColor,
                  color: color,
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  height: 20,
                }}
              />
              {isNew && (
                <Chip
                  icon={<FiberNewIcon sx={{ fontSize: '14px !important' }} />}
                  label="New"
                  size="small"
                  sx={{
                    backgroundColor: '#e8f5e9',
                    color: '#2e7d32',
                    fontWeight: 700,
                    fontSize: '0.7rem',
                    height: 20,
                  }}
                />
              )}
              {score !== undefined && (
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  Score: {score.toFixed(3)}
                </Typography>
              )}
            </Box>

            <Typography
              variant="body2"
              sx={{
                fontWeight: isNew ? 600 : 400,
                color: 'text.primary',
                mb: 0.5,
                lineHeight: 1.4,
              }}
            >
              {notification.Message}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AccessTimeIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary" title={formatTimestamp(notification.Timestamp)}>
                {timeAgo(notification.Timestamp)}
              </Typography>
              <Typography variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>
                · {formatTimestamp(notification.Timestamp)}
              </Typography>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
