const Footer = () => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 py-2 sm:py-3 bg-card/50 backdrop-blur-md border-t border-primary/30 z-50">
      <div className="container mx-auto text-center px-2 sm:px-4">
        <p className="text-xs sm:text-sm text-muted-foreground">
          Powered by <span className="text-primary text-glow-blue font-semibold">Elevates</span>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
