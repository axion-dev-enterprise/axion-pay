import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Menu, X, ArrowUpRight } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

export function Reveal({children, className = '', delay = 0}: {children: ReactNode; className?: string; delay?: number}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (element.getBoundingClientRect().top > window.innerHeight) element.classList.add('reveal-pending');
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {element.classList.remove('reveal-pending'); observer.disconnect();}
    }, {threshold: 0.08});
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} className={`reveal ${className}`} style={{transitionDelay: `${delay}ms`}}>{children}</div>;
}

export function MobileNavigation() {
  const [open, setOpen] = useState(false);
  return <div className="mobile-navigation"><Dialog.Root open={open} onOpenChange={setOpen}>
    <Dialog.Trigger className="menu-trigger" aria-label="Abrir menu"><Menu size={21}/></Dialog.Trigger>
    <Dialog.Portal><div className="pay-landing">
      <Dialog.Overlay style={{position:'fixed',inset:0,background:'#0009',zIndex:100}} />
      <Dialog.Content className="mobile-sheet" style={{position:'fixed',right:0,top:0,bottom:0,width:'90vw',zIndex:101,display:'flex',flexDirection:'column',borderLeft:'1px solid'}}>
        <div className="mobile-sheet-heading"><Dialog.Title>AXION <span>pay</span></Dialog.Title><Dialog.Close className="menu-trigger" aria-label="Fechar menu"><X size={22}/></Dialog.Close></div>
        <Dialog.Description>Seu negócio, sem fronteiras.</Dialog.Description>
        <nav aria-label="Menu mobile" className="mobile-links">{[['Soluções','#solucoes'],['Para quem é','#para-quem'],['Como começar','#como-comecar'],['Documentação','/docs']].map(([label,href]) => <a href={href} key={href} onClick={()=>setOpen(false)}>{label}<ArrowUpRight size={19}/></a>)}</nav>
        <a className="button button-primary" href="/dashboard">Acessar minha conta<ArrowUpRight size={18}/></a>
      </Dialog.Content>
    </div></Dialog.Portal>
  </Dialog.Root></div>;
}
