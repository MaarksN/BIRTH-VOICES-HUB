// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button, Input, EmptyState, Modal } from './index';

describe('design-system primitives', () => {
  describe('Button', () => {
    it('renders its label and fires onClick when clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<Button onClick={onClick}>Salvar</Button>);

      const button = screen.getByRole('button', { name: 'Salvar' });
      await user.click(button);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not fire onClick when disabled', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <Button onClick={onClick} disabled>
          Salvar
        </Button>
      );

      const button = screen.getByRole('button', { name: 'Salvar' });
      expect(button).toBeDisabled();

      await user.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });

    it('disables the button and hides onClick while isLoading is true', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(
        <Button onClick={onClick} isLoading>
          Salvar
        </Button>
      );

      const button = screen.getByRole('button', { name: 'Salvar' });
      expect(button).toBeDisabled();

      await user.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Input', () => {
    it('renders the label and reflects the current value', () => {
      render(<Input label="Nome" value="Catarina" onChange={() => {}} />);

      expect(screen.getByText('Nome')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Catarina')).toBeInTheDocument();
    });

    it('shows a validation error message when the error prop is set', () => {
      render(
        <Input label="Nome" value="" onChange={() => {}} error="Este campo é obrigatório" />
      );

      expect(screen.getByText('Este campo é obrigatório')).toBeInTheDocument();
    });
  });

  describe('EmptyState', () => {
    it('renders title and description, and omits the action when not provided', () => {
      render(<EmptyState title="Nenhum agente" description="Crie seu primeiro agente de voz." />);

      expect(screen.getByText('Nenhum agente')).toBeInTheDocument();
      expect(screen.getByText('Crie seu primeiro agente de voz.')).toBeInTheDocument();
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders the provided action element', () => {
      render(
        <EmptyState
          title="Nenhum agente"
          description="Crie seu primeiro agente de voz."
          action={<button>Criar Agente</button>}
        />
      );

      expect(screen.getByRole('button', { name: 'Criar Agente' })).toBeInTheDocument();
    });
  });

  describe('Modal', () => {
    it('renders nothing when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={() => {}} title="Detalhes">
          <p>Conteúdo do modal</p>
        </Modal>
      );

      expect(screen.queryByText('Detalhes')).not.toBeInTheDocument();
      expect(screen.queryByText('Conteúdo do modal')).not.toBeInTheDocument();
    });

    it('renders title and children, and calls onClose when the close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <Modal isOpen onClose={onClose} title="Detalhes">
          <p>Conteúdo do modal</p>
        </Modal>
      );

      expect(screen.getByText('Detalhes')).toBeInTheDocument();
      expect(screen.getByText('Conteúdo do modal')).toBeInTheDocument();

      const closeButtons = screen.getAllByRole('button');
      await user.click(closeButtons[closeButtons.length - 1]);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when the Escape key is pressed', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(
        <Modal isOpen onClose={onClose} title="Detalhes">
          <p>Conteúdo do modal</p>
        </Modal>
      );

      await user.keyboard('{Escape}');
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
