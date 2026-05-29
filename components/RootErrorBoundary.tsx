import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View } from 'react-native';
import * as Updates from 'expo-updates';
import { SafeAreaView } from 'react-native-safe-area-context';
import tw from '@/lib/tw';
import { AppText, Button } from '@/components/ui';
import { reportError } from '@/utils/logger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  isRestarting: boolean;
}

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, isRestarting: false };

  static getDerivedStateFromError(): State {
    return { hasError: true, isRestarting: false };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError('RootErrorBoundary caught render error', error);
    if (info.componentStack) {
      reportError('Component stack', info.componentStack);
    }
  }

  private handleRestart = async () => {
    if (this.state.isRestarting) return;
    this.setState({ isRestarting: true });

    try {
      if (
        Updates.isEnabled &&
        !Updates.isEmergencyLaunch
      ) {
        await Updates.reloadAsync();
      } else {
        this.setState({ hasError: false, isRestarting: false });
      }
    } catch (error) {
      reportError('Manual restart failed', error);
      this.setState({ isRestarting: false });
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={tw`flex-1 bg-cream-100 dark:bg-neutral-950`}>
          <View style={tw`flex-1 items-center justify-center px-8`}>
            <AppText style={tw`text-xl font-nunito-bold text-center mb-2`}>
              Something went wrong
            </AppText>
            <AppText style={tw`text-base text-neutral-600 dark:text-neutral-400 text-center mb-8`}>
              The app ran into an unexpected problem. Tap below to restart.
            </AppText>
            <Button
              onPress={this.handleRestart}
              loading={this.state.isRestarting}
              fullWidth
            >
              Restart app
            </Button>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}
