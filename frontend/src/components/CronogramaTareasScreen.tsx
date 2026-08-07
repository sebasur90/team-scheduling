import React from 'react';
import { CronogramaTareasPanel } from './CronogramaTareasPanel';
import './CronogramaTareasPanel.css';

interface CronogramaTareasScreenProps {
  readOnly?: boolean;
}

export const CronogramaTareasScreen: React.FC<CronogramaTareasScreenProps> = ({ readOnly = false }) => {
  return <CronogramaTareasPanel readOnly={readOnly} />;
};
